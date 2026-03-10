import { BaseDetector } from './BaseDetector';
import type { StitchedEntry, Finding, AutoDetectorConfig } from '../types';
export declare class AutoDetector extends BaseDetector {
    private apiKey?;
    private model;
    private maxEvents;
    private timeout;
    isFallback: boolean;
    constructor(config?: AutoDetectorConfig);
    detect(entry: StitchedEntry): Promise<Finding[]>;
    private callLLMWithRetry;
    private callLLM;
    private normalizeSeverity;
}
export default AutoDetector;
//# sourceMappingURL=AutoDetector.d.ts.map