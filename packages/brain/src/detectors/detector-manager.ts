import uniqBy from 'lodash/uniqBy'
import { ActivityPatternAnalyzer } from './activity-pattern-analyzer'
import { RecommendationGenerator } from './recommendation-generator'
import { ContextBasedFilter } from '../filters/context-based-filter'
import dayjs from 'dayjs'
import type { DetectorBuilder } from './detector-builder'
import type {
  Detector,
  DetectorFilter,
  DetectorManagerConfig,
  Finding,
  EventGroupMap,
  EventGroup
} from '../types'

function sliceByWindow(group: EventGroup, timeWindow: number): EventGroup {
  if (!isFinite(timeWindow)) return group
  const cutoff = dayjs().subtract(timeWindow, 'day')
  return { ...group, events: group.events.filter(e => !e.createdAt || dayjs(e.createdAt).isAfter(cutoff)) }
}

export class DetectorManager {
  private detectors: Detector[]
  private filterMechanism: DetectorFilter
  private context: Record<string, unknown>

  constructor(options: DetectorManagerConfig = {}) {
    const sdkDetectors = (options.builders ?? []).map((b: DetectorBuilder) => b.build())
    this.detectors = [
      ...sdkDetectors,
      new ActivityPatternAnalyzer(),
      new RecommendationGenerator(),
      ...(options.extraDetectors ?? [])
    ]
    this.filterMechanism = options.filterMechanism ?? new ContextBasedFilter()
    this.context = options.context ?? {}
  }

  async runDetectorsOn(eventGroups: EventGroupMap): Promise<Finding[]> {
    const groupDetectionTasks = Object.values(eventGroups).map(async (group: EventGroup) => {
      const events = Array.isArray(group?.events) ? group.events : []
      const categories = Array.from(new Set(events.map(e => e?.category || '').filter(Boolean)))
      const groupContext = { ...this.context, ...(categories.length === 1 ? { category: categories[0] } : {}) }

      const eligible = this.filterMechanism.filter(this.detectors, group, groupContext)
      const results = await Promise.all(
        eligible.map(detector =>
          detector.detect(sliceByWindow(group, detector.timeWindow)).catch(err => {
            console.warn('[DetectorManager] detector error:', detector.name, (err as Error)?.message)
            return [] as Finding[]
          })
        )
      )
      return results.flat().map(f => ({ ...f, groupKey: group.externalRef }))
    })

    const findingsByGroup = await Promise.all(groupDetectionTasks)
    let findings: Finding[] = findingsByGroup.flat()

    for (const detector of this.detectors) {
      if (detector.finalize) {
        try {
          const final = await detector.finalize()
          if (Array.isArray(final)) findings = findings.concat(final)
        } catch (err) {
          console.error('[DetectorManager] finalize error:', detector.name, (err as Error)?.message)
        }
      }
    }

    return uniqBy(findings.filter(f => f?.id), 'id')
  }
}

export default DetectorManager
