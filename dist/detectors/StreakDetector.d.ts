import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding, StreakConfig, StreakTrigger } from '../types';
export declare class StreakDetector extends BaseDetector {
    minRepeat: number;
    triggerOn: StreakTrigger;
    private messageFormatter?;
    constructor(config: StreakConfig);
    private predictNextDate;
    private buildMessage;
    detect(entry: EventGroup): Promise<Finding[]>;
}
export default StreakDetector;
//# sourceMappingURL=StreakDetector.d.ts.map