import { DetectorBuilder } from '../DetectorBuilder'
import { StreakDetector } from '../StreakDetector'
import { ChecklistDetector } from '../ChecklistDetector'
import { MilestoneDetector } from '../MilestoneDetector'
import { ThresholdDetector } from '../ThresholdDetector'
import { ItemAnalysisDetector } from '../ItemAnalysisDetector'

// Serializable detector config — sent from SDK to API, reconstructed into a DetectorBuilder here
export interface DetectorConfig {
  name: string
  type: 'checklist' | 'milestone' | 'streak-ongoing' | 'streak-break' | 'threshold' | 'item-analysis'
  marker?: string
  severity?: 'info' | 'warning' | 'success' | 'error'
  expected?: string[]
  extract?: { path: string }
  todayOnly?: boolean
  minRepeat?: number
  operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
  value?: number
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  lookup?: {
    map?: Record<string, Record<string, number>>
    api?: { urlTemplate: string; responsePath?: string; timeout?: number }
  }
  targets?: Record<string, number>
}

export function toBuilder(config: DetectorConfig): DetectorBuilder {
  const { name, type, severity, marker } = config
  let inner

  switch (type) {
    case 'streak-ongoing':
      inner = new StreakDetector({ name, severity, minRepeat: config.minRepeat, triggerOn: 'ongoing' })
      break
    case 'streak-break':
      inner = new StreakDetector({ name, severity, minRepeat: config.minRepeat, triggerOn: 'break' })
      break
    case 'checklist':
      inner = new ChecklistDetector({ name, severity, expectedItems: (config.expected ?? []).map(key => ({ key })), todayOnly: config.todayOnly })
      break
    case 'milestone':
      inner = new MilestoneDetector({ name, severity, milestones: (config.expected ?? []).map(key => ({ key })), todayOnly: config.todayOnly })
      break
    case 'threshold':
      if (!config.extract?.path) throw new Error(`ThresholdDetector "${name}" requires extract.path`)
      if (!config.operator)      throw new Error(`ThresholdDetector "${name}" requires operator`)
      if (config.value === undefined) throw new Error(`ThresholdDetector "${name}" requires value`)
      inner = new ThresholdDetector({ name, severity, extract: { path: config.extract.path }, operator: config.operator, value: config.value, aggregate: config.aggregate, todayOnly: config.todayOnly })
      break
    case 'item-analysis':
      if (!config.extract?.path) throw new Error(`ItemAnalysisDetector "${name}" requires extract.path`)
      if (!config.lookup)        throw new Error(`ItemAnalysisDetector "${name}" requires lookup`)
      if (!config.targets)       throw new Error(`ItemAnalysisDetector "${name}" requires targets`)
      inner = new ItemAnalysisDetector({ name, severity, extract: { path: config.extract.path }, lookup: config.lookup, targets: config.targets, aggregate: config.aggregate as 'sum' | 'avg' | undefined })
      break
    default:
      throw new Error(`Unknown detector type: ${type}`)
  }

  const builder = new DetectorBuilder(inner)
  if (marker) builder.addMarker(marker)
  return builder
}
