import { BaseDetectorFilter } from './BaseDetectorFilter';
import type { Detector, EventGroup } from '../types';
export declare class ContextBasedFilter extends BaseDetectorFilter {
    filter(detectors: Detector[], group: EventGroup, context?: Record<string, unknown>): Detector[];
}
export default ContextBasedFilter;
//# sourceMappingURL=ContextBasedFilter.d.ts.map