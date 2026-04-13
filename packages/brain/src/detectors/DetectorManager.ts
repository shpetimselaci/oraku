import uniqBy from 'lodash/uniqBy'
import { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
import { RecommendationGenerator } from './RecommendationGenerator'
import { ContextBasedFilter } from '../filters/ContextBasedFilter'
import type { DetectorBuilder } from './DetectorBuilder'
import type {
  Detector,
  DetectorFilter,
  DetectorManagerConfig,
  Finding,
  EventGroupMap,
  EventGroup
} from '../types'

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
      const findings: Finding[] = []
      for (const detector of eligible) {
        try {
          const results = await detector.detect(group)
          if (Array.isArray(results)) findings.push(...results)
        } catch (err) {
          console.warn('[DetectorManager] detector error:', detector.name, (err as Error)?.message)
        }
      }
      return findings.map(f => ({ ...f, groupKey: group.externalRef }))
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
