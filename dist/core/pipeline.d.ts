import type { Event, Finding } from '../types';
export interface PipelineOptions {
    groupBy?: string | string[];
    apiKey?: string;
}
export interface PipelineResult {
    count: number;
    findings: Finding[];
    notifications: string[];
}
export declare function runPipeline(events: Event[], options?: PipelineOptions): Promise<PipelineResult>;
//# sourceMappingURL=pipeline.d.ts.map