import type { DetectorManagerOptions, Finding, StitchedData } from '../types';
export declare class DetectorManager {
    private options;
    private detectors;
    private filterMechanism;
    private globalContext;
    constructor(options?: DetectorManagerOptions);
    runOnStitched(stitchedData: StitchedData): Promise<Finding[]>;
}
export default DetectorManager;
//# sourceMappingURL=DetectorManager.d.ts.map