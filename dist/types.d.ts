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
export interface EventGroup {
    externalRef: string;
    events: Event[];
    first?: string;
    last?: string;
    count: number;
}
export type EventGroupMap = Record<string, EventGroup>;
export type Severity = 'info' | 'warning' | 'success' | 'error';
export interface Finding {
    id: string;
    detector: string;
    severity: Severity;
    message: string;
    evidence: Record<string, unknown>;
    [key: string]: unknown;
}
export interface FindingData {
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
    detect(entry: EventGroup): Promise<Finding[]>;
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
        unit: 'day' | 'week' | 'month' | 'year';
        value: number;
    } | null;
    aggregate?: boolean;
}
export type StreakTrigger = 'ongoing' | 'break';
export type StreakFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly';
export interface StreakConfig extends DetectorConfig {
    minRepeat?: number;
    triggerOn?: StreakTrigger;
    frequency?: StreakFrequency;
    message?: (pattern: string) => string;
}
export interface ActivityPatternAnalyzerConfig extends DetectorConfig {
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
export interface LLMDetectorConfig extends DetectorConfig {
    apiKey?: string;
    model?: string;
    maxEvents?: number;
    timeout?: number;
}
export interface RawLLMFinding {
    severity: Severity;
    message: string;
    category: string;
    evidence: string;
}
export interface DetectorManagerConfig {
    only?: string;
    filterMechanism?: DetectorFilter;
    context?: Record<string, unknown>;
}
export interface DetectorFilter {
    filter(detectors: Detector[], entry: EventGroup, context: Record<string, unknown>): Detector[];
}
export type BuiltinDetectorType = 'checklist' | 'streak-ongoing' | 'streak-break';
//# sourceMappingURL=types.d.ts.map