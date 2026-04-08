import { BaseDetectorFilter } from './BaseDetectorFilter'
import { countPatterns, getTopPattern } from '../detectors/helpers/EventCounter'
import type { Detector, EventGroup, ExtendedDetector } from '../types'

export class ContextBasedFilter extends BaseDetectorFilter {
  filter(
    detectors: Detector[],
    group: EventGroup,
    context: Record<string, unknown> = {}
  ): Detector[] {
    const events = Array.isArray(group?.events) ? group.events : []
    const needsPatternCount = (detectors as ExtendedDetector[]).some(d => d.requiresRecurring && d.recurringThreshold)
    const mostCommonCount = needsPatternCount ? getTopPattern(countPatterns(events)).count : 0

    return detectors.filter((d) => {
      const detector = d as ExtendedDetector

      if (detector.minEvents && events.length < detector.minEvents) {
        return false
      }
      if (
        detector.requiresRecurring &&
        detector.recurringThreshold &&
        mostCommonCount < detector.recurringThreshold
      ) {
        return false
      }
      if (
        detector.supportedCategories &&
        context.category &&
        !detector.supportedCategories.includes(context.category as string)
      ) {
        return false
      }
      return true
    })
  }
}

export default ContextBasedFilter
