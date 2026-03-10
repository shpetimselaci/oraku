import { BaseDetector } from './BaseDetector';
import type { StitchedEntry, Finding, AnalyzerConfig } from '../types';
export declare class AutoAnalyzer extends BaseDetector {
    private streakDetector;
    private breakDetector;
    constructor(config?: AnalyzerConfig);
    detect(entry: StitchedEntry): Promise<Finding[]>;
    private detectMissingVariety;
    private detectRecentSummary;
    private safeTimestamp;
}
export default AutoAnalyzer;
//# sourceMappingURL=AutoAnalyzer.d.ts.map