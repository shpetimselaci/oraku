import uniqBy from 'lodash/uniqBy'
import { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
import { RecommendationGenerator } from './RecommendationGenerator'
import { LLMDetector } from './LLMDetector'
import { ChatProvider } from '../providers/ChatProvider'
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
  private sdkDetectors: Detector[]
  private analyzer: ActivityPatternAnalyzer
  private llmFallback: LLMDetector
  private postProcessors: Detector[]
  private filterMechanism: DetectorFilter
  private context: Record<string, unknown>

  constructor(options: DetectorManagerConfig = {}) {
    // tier 1 — builder-registered detectors
    this.sdkDetectors = (options.builders ?? []).map((b: DetectorBuilder) => b.build())

    // tier 2 — built-in pattern analyzer
    this.analyzer = new ActivityPatternAnalyzer()

    // tier 3 — llm fallback
    this.llmFallback = new LLMDetector({ provider: new ChatProvider({ baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL }) })

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

      // tier 3 — llm fallback, only if analyzer found nothing
      if (!groupFindings.length) {
        groupFindings = await this.runTier([this.llmFallback], group, triggeredDetectors, true)
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

    return uniqBy(findings.filter(f => f?.id), 'id')
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
