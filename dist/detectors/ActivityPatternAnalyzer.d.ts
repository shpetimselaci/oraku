import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding, ActivityPatternAnalyzerConfig } from '../types';
export declare class ActivityPatternAnalyzer extends BaseDetector {
    private ongoingStreakDetector;
    private breakStreakDetector;
    constructor(config?: ActivityPatternAnalyzerConfig);
    detect(entry: EventGroup): Promise<Finding[]>;
    private findDormantCategories;
    private summarizeRecentActivity;
    private getTimestamp;
}
export default ActivityPatternAnalyzer;
//# sourceMappingURL=ActivityPatternAnalyzer.d.ts.map