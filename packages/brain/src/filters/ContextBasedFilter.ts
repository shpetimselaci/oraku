import { BaseDetectorFilter } from './BaseDetectorFilter'
import type { Detector, EventGroup } from '../types'

export class ContextBasedFilter extends BaseDetectorFilter {
  filter(
    detectors: Detector[],
    group: EventGroup,
    context: Record<string, unknown> = {}
  ): Detector[] {
    return detectors.filter(detector => {
      if (!detector.conditions?.length) return true
      return detector.conditions.every(condition => condition(group, context))
    })
  }
}

export default ContextBasedFilter
