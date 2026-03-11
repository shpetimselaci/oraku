import type { Event } from '../types';
export interface TypeCounts {
    [key: string]: number;
}
export interface MostFrequent {
    key: string | null;
    count: number;
}
export declare function countByType(events: Event[]): TypeCounts;
export declare function getMostFrequent(counts: TypeCounts): MostFrequent;
export declare function filterByType(events: Event[], typeKey: string): Event[];
declare const _default: {
    countByType: typeof countByType;
    getMostFrequent: typeof getMostFrequent;
    filterByType: typeof filterByType;
};
export default _default;
//# sourceMappingURL=EventCounter.d.ts.map