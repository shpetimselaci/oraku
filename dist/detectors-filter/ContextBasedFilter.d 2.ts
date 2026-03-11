import { MechanismToFilterDetectors } from './MechanismToFilterDetectors';
import type { Detector, StitchedEntry } from '../types';
export declare class ContextBasedFilter extends MechanismToFilterDetectors {
    filter(detectors: Detector[], stitchedEntry: StitchedEntry, context?: Record<string, unknown>): Detector[];
}
export default ContextBasedFilter;
//# sourceMappingURL=ContextBasedFilter.d.ts.map