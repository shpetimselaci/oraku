import availableDetectors from './index'
import { createDetector } from './createDetector'
import { ContextBasedFilter } from '../detectors-filter/ContextBasedFilter'
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
    let detectors: Detector[] = [...availableDetectors, ...createDetector.getAll()]

    if (options.only) {
      detectors = detectors.filter((d) => d.name === options.only)
    }

    this.detectors = detectors
    this.filterMechanism = options.filterMechanism || new ContextBasedFilter()
    this.context = options.context || {}
  }

  async runDetectorsOn(eventGroups: EventGroupMap): Promise<Finding[]> {
    const triggeredDetectors = new Set<Detector>()

    const primaryDetectors = this.detectors.filter((d) => !d.isFallback)
    const fallbackDetectors = this.detectors.filter((d) => d.isFallback)

    const groupDetectionTasks = Object.values(eventGroups).map(
      async (group: EventGroup) => {
        const events = Array.isArray(group?.events) ? group.events : []

        const categories = Array.from(
          new Set(events.map((e) => (e && e.category) || '').filter(Boolean))
        )

        const groupContext: Record<string, unknown> = { ...this.context }
        if (categories.length === 1) groupContext.category = categories[0]

        const selectedPrimaryDetectors = this.filterMechanism.filter(primaryDetectors, group, groupContext)

        let groupFindings: Finding[] = []
        for (const detector of selectedPrimaryDetectors) {
          try {
            triggeredDetectors.add(detector)
            const results = await detector.detect(group)
            if (Array.isArray(results)) groupFindings.push(...results)
          } catch (err) {
            console.warn('[DetectorManager] Detector error:', detector.name, (err as Error)?.message)
          }
        }

        if (groupFindings.length === 0 && fallbackDetectors.length > 0) {
          for (const detector of fallbackDetectors) {
            try {
              triggeredDetectors.add(detector)
              const results = await detector.detect(group)
              if (Array.isArray(results)) groupFindings.push(...results)
            } catch {
              // silently ignore fallback errors
            }
          }
        }

        // tag each finding with its group so the pipeline can route notifications per user
        return groupFindings.map(f => ({ ...f, groupKey: group.externalRef }))
      }
    )

    const findingsByGroup = await Promise.all(groupDetectionTasks)
    let findings: Finding[] = findingsByGroup.flat()

    for (const detector of triggeredDetectors) {
      if (detector.finalize) {
        try {
          const finalFindings = await detector.finalize()
          if (Array.isArray(finalFindings)) findings = findings.concat(finalFindings)
        } catch (err) {
          console.error('Detector finalize error', detector.name, (err as Error)?.message)
        }
      }
    }

    const seenFindingIds = new Set<string>()
    findings = findings.filter((finding) => {
      if (!finding?.id || seenFindingIds.has(finding.id)) return false
      seenFindingIds.add(finding.id)
      return true
    })

    return findings
  }
}

export default DetectorManager
