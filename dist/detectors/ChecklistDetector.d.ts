import { BaseDetector } from './BaseDetector';
import type { Event, EventGroup, Finding, ExpectedItem, ChecklistConfig } from '../types';
export declare class ChecklistDetector extends BaseDetector {
    expectedItems: ExpectedItem[];
    extractItems: (event: Event) => string | string[];
    itemMatcher: ((actual: string, expected: ExpectedItem) => boolean) | null;
    itemComparer: ((items: string[], expected: ExpectedItem[], results: unknown[]) => Promise<{
        covered: Set<string>;
        missing: string[];
    }>) | null;
    messageFormatter: string | ((missing: string[]) => string);
    todayOnly: boolean;
    dateFilter: {
        unit: 'day' | 'week' | 'month' | 'year';
        value: number;
    } | null;
    aggregate: boolean;
    private pendingItems;
    constructor(config: ChecklistConfig);
    detect(entry: EventGroup): Promise<Finding[]>;
    finalize(): Promise<Finding[]>;
    private buildFindings;
    private filterByDateOffset;
}
export default ChecklistDetector;
//# sourceMappingURL=ChecklistDetector.d.ts.map