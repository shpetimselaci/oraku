import { DetectorBuilder } from '../DetectorBuilder'
import { StreakDetector } from '../StreakDetector'
import { ChecklistDetector } from '../ChecklistDetector'
import { MilestoneDetector } from '../MilestoneDetector'
import { ThresholdDetector } from '../ThresholdDetector'
import { ItemAnalysisDetector } from '../ItemAnalysisDetector'
import type { SDKDetectorSchema } from '../../types'

export type { SDKDetectorSchema }

export function toBuilder(config: SDKDetectorSchema): DetectorBuilder {
  const { name, type, notificationType, marker, scheduleAt } = config
  let inner

  switch (type) {
    case 'streak-ongoing':
      inner = new StreakDetector({ name, notificationType, scheduleAt, minRepeat: config.minRepeat, precision: config.precision, triggerOn: 'ongoing' })
      break
    case 'streak-break':
      inner = new StreakDetector({ name, notificationType, scheduleAt, minRepeat: config.minRepeat, precision: config.precision, triggerOn: 'break' })
      break
    case 'checklist':
      inner = new ChecklistDetector({ name, notificationType, scheduleAt, expectedItems: (config.expected ?? []).map(key => ({ key })), todayOnly: config.todayOnly, dateFilter: config.dateFilter, extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '' })
      break
    case 'milestone':
      inner = new MilestoneDetector({ name, notificationType, scheduleAt, milestones: (config.expected ?? []).map(key => ({ key })), todayOnly: config.todayOnly, extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '' })
      break
    case 'threshold':
      if (!config.extract?.path) throw new Error(`ThresholdDetector "${name}" requires extract.path`)
      if (!config.operator)      throw new Error(`ThresholdDetector "${name}" requires operator`)
      if (config.value === undefined) throw new Error(`ThresholdDetector "${name}" requires value`)
      inner = new ThresholdDetector({ name, notificationType, scheduleAt, extract: { path: config.extract.path }, operator: config.operator, value: config.value, aggregate: config.aggregate, todayOnly: config.todayOnly })
      break
    case 'item-analysis':
      if (!config.extract?.path) throw new Error(`ItemAnalysisDetector "${name}" requires extract.path`)
      if (!config.lookup)        throw new Error(`ItemAnalysisDetector "${name}" requires lookup`)
      if (!config.targets)       throw new Error(`ItemAnalysisDetector "${name}" requires targets`)
      inner = new ItemAnalysisDetector({ name, notificationType, scheduleAt, extract: { path: config.extract.path }, lookup: config.lookup, targets: config.targets, aggregate: config.aggregate as 'sum' | 'avg' | undefined, todayOnly: config.todayOnly, dateFilter: config.dateFilter })
      break
    default:
      throw new Error(`Unknown detector type: ${type}`)
  }

  const builder = new DetectorBuilder(inner)
  if (marker) builder.addMarker(marker)
  return builder
}
