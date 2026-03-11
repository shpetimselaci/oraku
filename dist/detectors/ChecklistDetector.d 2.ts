import { BaseDetector } from './BaseDetector';
import type { Event, StitchedEntry, Finding, ExpectedItem, ChecklistConfig } from '../types';
export declare class ChecklistDetector extends BaseDetector {
    expectedItems: ExpectedItem[];
    extractActual: (event: Event) => string | string[];
    matchFn: ((actual: string, expected: ExpectedItem) => boolean) | null;
    compareFn: ((items: string[], expected: ExpectedItem[], results: unknown[]) => Promise<{
        covered: Set<string>;
        missing: string[];
    }>) | null;
    messageFn: string | ((missing: string[]) => string);
    todayOnly: boolean;
    dateFilter: {
        unit: 'day' | 'month' | 'year';
        value: number;
    } | null;
    aggregate: boolean;
    private _aggregatedItems;
    constructor(config: ChecklistConfig);
    detect(entry: StitchedEntry): Promise<Finding[]>;
    finalize(): Promise<Finding[]>;
    private _buildFindings;
    private _filterByDateRange;
}
export default ChecklistDetector;
//# sourceMappingURL=ChecklistDetector.d.ts.map