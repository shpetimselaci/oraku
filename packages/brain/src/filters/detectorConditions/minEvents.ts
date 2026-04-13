import type { DetectorCondition } from '../../types'

export const minEvents = (n: number): DetectorCondition =>
  (group) => (group.events?.length ?? 0) >= n
