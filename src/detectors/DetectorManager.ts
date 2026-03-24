import { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
import { RecommendationGenerator } from './RecommendationGenerator'
import { GroqFallbackDetector } from './GroqFallbackDetector'
import { ContextBasedFilter } from '../filters/ContextBasedFilter'
import { buildDetectorFromConfig } from './helpers/buildDetectorFromConfig'
import { createDetector } from './helpers/detectorFactory'
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
  private sdkDetectors: Detector[]
  private analyzer: ActivityPatternAnalyzer
  private groqFallback: GroqFallbackDetector
  private postProcessors: Detector[]
  private filterMechanism: DetectorFilter
  private context: Record<string, unknown>

  constructor(options: DetectorManagerConfig = {}) {
    const configs = options.detectorConfigs ?? []

    const dataSources = [...new Set(configs.map(c => c.dataSource).filter((s): s is string => !!s))]

    // tier 1 — SDK registered detectors (builders take priority, configs are legacy)
    const fromBuilders = (options.builders ?? []).map((b: DetectorBuilder) => b.build())
    const fromConfigs  = configs.map(c => buildDetectorFromConfig(
      c,
      (name, cfg) => createDetector(name, 'checklist', cfg as any),
      (name, type, cfg) => createDetector(name, type, cfg as any)
    ))
    this.sdkDetectors = [...fromBuilders, ...fromConfigs]

    // tier 2 — built-in pattern analyzer
    this.analyzer = new ActivityPatternAnalyzer({ dataSources: dataSources.length ? dataSources : undefined })

    // tier 3 — groq fallback
    this.groqFallback = new GroqFallbackDetector()

    // post-processing — runs after all groups regardless of tier
    this.postProcessors = [new RecommendationGenerator(), ...(options.extraDetectors ?? [])]

    this.filterMechanism = options.filterMechanism || new ContextBasedFilter()
    this.context = options.context || {}
  }

  async runDetectorsOn(eventGroups: EventGroupMap): Promise<Finding[]> {
    const triggeredDetectors = new Set<Detector>()

    const groupDetectionTasks = Object.values(eventGroups).map(async (group: EventGroup) => {
      const events = Array.isArray(group?.events) ? group.events : []
      const categories = Array.from(new Set(events.map(e => e?.category || '').filter(Boolean)))
      const groupContext = { ...this.context, ...(categories.length === 1 ? { category: categories[0] } : {}) }

      // tier 1 — sdk detectors
      let groupFindings = await this.runTier(
        this.filterMechanism.filter(this.sdkDetectors, group, groupContext),
        group,
        triggeredDetectors,
        false
      )

      // tier 2 — activity pattern analyzer, only if sdk found nothing
      if (!groupFindings.length) {
        groupFindings = await this.runTier([this.analyzer], group, triggeredDetectors, false)
      }

      // tier 3 — groq fallback, only if analyzer found nothing
      if (!groupFindings.length) {
        groupFindings = await this.runTier([this.groqFallback], group, triggeredDetectors, true)
      }

      return groupFindings.map(f => ({ ...f, groupKey: group.externalRef }))
    })

    const findingsByGroup = await Promise.all(groupDetectionTasks)
    let findings: Finding[] = findingsByGroup.flat()

    // post-processors always run after all groups
    for (const detector of [...this.postProcessors, ...triggeredDetectors]) {
      if (detector.finalize) {
        try {
          const final = await detector.finalize()
          if (Array.isArray(final)) findings = findings.concat(final)
        } catch (err) {
          console.error('[DetectorManager] finalize error:', detector.name, (err as Error)?.message)
        }
      }
    }

    // deduplicate
    const seen = new Set<string>()
    return findings.filter(f => {
      if (!f?.id || seen.has(f.id)) return false
      seen.add(f.id)
      return true
    })
  }

  private async runTier(
    detectors: Detector[],
    group: EventGroup,
    triggered: Set<Detector>,
    silent: boolean
  ): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const detector of detectors) {
      try {
        triggered.add(detector)
        const results = await detector.detect(group)
        if (Array.isArray(results)) findings.push(...results)
      } catch (err) {
        if (!silent) console.warn('[DetectorManager] detector error:', detector.name, (err as Error)?.message)
      }
    }
    return findings
  }
}

export default DetectorManager
