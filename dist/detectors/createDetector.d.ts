import type { Detector, BuiltinDetectorType, ExpectedItem, Event, Severity } from '../types';
interface ApiMatcherConfig {
    url: (item: string) => string;
    transform?: (data: unknown) => unknown;
    match: (result: unknown, expected: ExpectedItem) => boolean;
    maxItems?: number;
    timeout?: number;
    cacheKey?: (item: string) => string;
    cachePath?: string;
}
interface ChecklistDetectorConfig {
    dataSource?: string;
    severity?: Severity;
    expected?: (string | ExpectedItem)[];
    extract?: (entry: Event) => string | string[];
    compare?: (items: string[], expectedItems: ExpectedItem[], results: unknown[]) => Promise<{
        covered: Set<string>;
        missing: string[];
    }>;
    match?: (actual: string, expected: ExpectedItem) => boolean;
    api?: ApiMatcherConfig;
    todayOnly?: boolean;
    dateFilter?: {
        unit: 'day' | 'month' | 'year';
        value: number;
    } | null;
    aggregate?: boolean;
    message?: string | ((missing: string[]) => string);
}
interface StreakDetectorConfig {
    dataSource?: string;
    severity?: Severity;
    minRepeat?: number;
    message?: (pattern: string) => string;
}
type DetectorOptions = ChecklistDetectorConfig | StreakDetectorConfig;
declare function createDetector(name: string, type: BuiltinDetectorType, config?: DetectorOptions): Detector;
declare namespace createDetector {
    var getAll: () => Detector[];
    var clear: () => void;
}
export default createDetector;
export { createDetector };
//# sourceMappingURL=createDetector.d.ts.map