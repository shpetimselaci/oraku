import type { Event } from '../types';
export interface PatternCounts {
    [key: string]: number;
}
export interface TopPattern {
    key: string | null;
    count: number;
}
export declare function countPatterns(events: Event[]): PatternCounts;
export declare function getTopPattern(counts: PatternCounts): TopPattern;
export declare function filterByPattern(events: Event[], patternKey: string): Event[];
declare const _default: {
    countPatterns: typeof countPatterns;
    getTopPattern: typeof getTopPattern;
    filterByPattern: typeof filterByPattern;
};
export default _default;
//# sourceMappingURL=EventCounter.d.ts.map