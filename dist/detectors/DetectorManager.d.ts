import type { DetectorManagerConfig, Finding, EventGroupMap } from '../types';
export declare class DetectorManager {
    private detectors;
    private filterMechanism;
    private context;
    constructor(options?: DetectorManagerConfig);
    runDetectorsOn(eventGroups: EventGroupMap): Promise<Finding[]>;
}
export default DetectorManager;
//# sourceMappingURL=DetectorManager.d.ts.map