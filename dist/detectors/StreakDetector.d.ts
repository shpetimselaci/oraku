import { BaseDetector } from './BaseDetector';
import type { StitchedEntry, Finding, StreakConfig, TriggerMode } from '../types';
export declare class StreakDetector extends BaseDetector {
    minimumRepetitions: number;
    triggerMode: TriggerMode;
    private _messageFn?;
    constructor(config: StreakConfig);
    private predictNext;
    private formatMessage;
    detect(entry: StitchedEntry): Promise<Finding[]>;
}
export default StreakDetector;
//# sourceMappingURL=StreakDetector.d.ts.map