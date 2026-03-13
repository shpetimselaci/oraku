import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding, StreakConfig, StreakFrequency, StreakTrigger } from '../types';
export declare class StreakDetector extends BaseDetector {
    minRepeat: number;
    triggerOn: StreakTrigger;
    frequency: StreakFrequency;
    private messageFormatter?;
    constructor(config: StreakConfig);
    private advancePastWeekend;
    private isWeekend;
    private predictNextDate;
    private buildMessage;
    detect(entry: EventGroup): Promise<Finding[]>;
}
export default StreakDetector;
//# sourceMappingURL=StreakDetector.d.ts.map