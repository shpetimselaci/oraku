import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding } from '../types';
export declare class RecommendationDetector extends BaseDetector {
    private userProfiles;
    private usernames;
    private activityPopularity;
    constructor();
    detect(entry: EventGroup): Promise<Finding[]>;
    finalize(): Promise<Finding[]>;
}
export default RecommendationDetector;
//# sourceMappingURL=RecommendationDetector.d.ts.map