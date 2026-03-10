export interface Event {
    externalRef?: string;
    category?: string;
    subcategory?: string;
    name?: string;
    log?: string;
    action?: string;
    items?: string[];
    createdAt?: string;
    date?: string;
    meta?: Record<string, unknown>;
}
export interface StitchedEntry {
    externalRef: string;
    events: Event[];
    first?: string;
    last?: string;
    count: number;
}
export type StitchedData = Record<string, StitchedEntry>;
export type Severity = 'info' | 'warning' | 'success' | 'error';
export interface Finding {
    id: string;
    detector: string;
    severity: Severity;
    message: string;
    evidence: Record<string, unknown>;
    [key: string]: unknown;
}
export interface FindingInput {
    id?: string;
    severity?: Severity;
    message: string;
    evidence?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface DetectorConfig {
    name?: string;
    description?: string;
    dataSource?: string;
    severity?: Severity;
}
export interface Detector {
    name: string;
    description: string;
    dataSource: string | null;
    severity: Severity;
    isFallback?: boolean;
    detect(entry: StitchedEntry): Promise<Finding[]>;
    finalize?(): Promise<Finding[]>;
}
export interface ExpectedItem {
    key: string;
    keywords?: string[];
    match?: RegExp;
    api?: string;
}
export interface ChecklistConfig extends DetectorConfig {
    expectedItems?: ExpectedItem[];
    extractActual?: (event: Event) => string | string[];
    matchFn?: (actual: string, expected: ExpectedItem) => boolean;
    compareFn?: (items: string[], expected: ExpectedItem[], results: unknown[]) => Promise<{
        covered: Set<string>;
        missing: string[];
    }>;
    message?: string | ((missing: string[]) => string);
    todayOnly?: boolean;
    dateFilter?: {
        unit: 'day' | 'month' | 'year';
        value: number;
    } | null;
    aggregate?: boolean;
}
export type TriggerMode = 'ongoing' | 'break';
export interface StreakConfig extends DetectorConfig {
    minRepeat?: number;
    triggerOn?: TriggerMode;
    message?: (pattern: string) => string;
}
export interface AnalyzerConfig extends DetectorConfig {
    minStreakLength?: number;
    breakThresholdDays?: number;
}
export interface EventAnalysis {
    byCategory: Record<string, Event[]>;
    bySubcategory: Record<string, Event[]>;
    byName: Record<string, Date[]>;
    timeline: Array<{
        date: Date;
        category: string;
        activityName: string;
    }>;
}
export interface AutoDetectorConfig extends DetectorConfig {
    apiKey?: string;
    model?: string;
    maxEvents?: number;
    timeout?: number;
}
export interface LLMFinding {
    severity: Severity;
    message: string;
    category: string;
    evidence: string;
}
export interface DetectorManagerOptions {
    only?: string;
    filterMechanism?: DetectorFilter;
    context?: Record<string, unknown>;
}
export interface DetectorFilter {
    filter(detectors: Detector[], entry: StitchedEntry, context: Record<string, unknown>): Detector[];
}
export interface DetectConfig {
    name?: string;
    source?: string;
    when?: 'today' | 'week' | 'month';
    missing?: string[];
    expected?: ExpectedItem[];
    repeats?: number;
    breaks?: number;
    severity?: Severity;
    message?: string;
    extract?: (event: Event) => string | string[];
    match?: (actual: string, expected: ExpectedItem) => boolean;
}
export type DetectorType = 'checklist' | 'streak-ongoing' | 'streak-break';
//# sourceMappingURL=types.d.ts.map