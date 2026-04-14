import { countPatterns, getTopPattern } from '../../detectors/helpers/event-counter'
import type { DetectorCondition } from '../../types'

export const requiresRecurring = (threshold: number): DetectorCondition =>
  (group) => getTopPattern(countPatterns(group.events ?? [])).count >= threshold
