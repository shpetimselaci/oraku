import { DetectorBuilder } from '../detector-builder'
import { StreakDetector } from '../streak-detector'
import { ChecklistDetector } from '../checklist-detector'
import { MilestoneDetector } from '../milestone-detector'
import { ThresholdDetector } from '../threshold-detector'
import { ItemAnalysisDetector } from '../item-analysis-detector'
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
      inner = new ThresholdDetector({ name, notificationType, scheduleAt, extract: { path: config.extract?.path ?? '' }, operator: config.operator!, value: config.value!, aggregate: config.aggregate, todayOnly: config.todayOnly })
      break
    case 'item-analysis':
      inner = new ItemAnalysisDetector({ name, notificationType, scheduleAt, extract: { path: config.extract?.path ?? '' }, lookup: config.lookup!, targets: config.targets!, aggregate: config.aggregate as 'sum' | 'avg' | undefined, todayOnly: config.todayOnly, dateFilter: config.dateFilter })
      break
    default:
      throw new Error(`Unknown detector type: ${type}`)
  }

  const builder = new DetectorBuilder(inner)
  if (marker) builder.addMarker(marker)
  return builder
}
