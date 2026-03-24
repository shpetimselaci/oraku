import type { Detector, EventGroup, DetectorFilter } from '../types'

export class BaseDetectorFilter implements DetectorFilter {
  filter(
    detectors: Detector[],
    _group: EventGroup,
    _context: Record<string, unknown>
  ): Detector[] {
    return detectors
  }
}

export default BaseDetectorFilter
