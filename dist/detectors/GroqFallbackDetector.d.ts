import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding, LLMDetectorConfig } from '../types';
export declare class GroqFallbackDetector extends BaseDetector {
    private apiKey?;
    private model;
    private maxEvents;
    private timeout;
    isFallback: boolean;
    private pendingEntries;
    constructor(config?: LLMDetectorConfig);
    detect(entry: EventGroup): Promise<Finding[]>;
    finalize(): Promise<Finding[]>;
    private callGroqWithRetry;
    private callGroqAPI;
    private parseSeverity;
}
export default GroqFallbackDetector;
//# sourceMappingURL=GroqFallbackDetector.d.ts.map