import type { StitchedEntry, Event, Finding, FindingInput, Severity, DetectorConfig, Detector } from '../types';
/**
 * Optimized BaseDetector
 * Focuses on O(n) performance and minimal Garbage Collection pressure.
 */
export declare abstract class BaseDetector implements Detector {
    readonly name: string;
    readonly description: string;
    readonly dataSource: string | null;
    readonly severity: Severity;
    isFallback?: boolean;
    constructor(config?: DetectorConfig);
    /**
     * Abstract method: Subclasses MUST implement this.
     */
    abstract detect(entry: StitchedEntry): Promise<Finding[]>;
    /**
     * Normalizes input into a flat Event array.
     */
    protected extractEvents(entry: StitchedEntry | Event[]): Event[];
    /**
     * Safe conversion of various date representations into a Date object.
     * Returns null for invalid or missing values. Used by downstream detectors.
     */
    protected toDate(value: string | Date | null | undefined): Date | null;
    /**
     * Checks if a date string matches today's ISO date (YYYY-MM-DD).
     * Uses string comparison to avoid heavy Date object instantiation in loops.
     */
    isDateToday(dateValue: string | Date): boolean;
    /**
     * Highly efficient filtering by date range.
     * Compares strings rather than creating Date objects for every iteration.
     */
    filterEventsByDateRange(events: Event[], targetDate: string | Date, unit?: 'day' | 'month' | 'year'): Event[];
    /**
     * Builds a finding with a guaranteed unique ID.
     */
    buildFinding(input: FindingInput): Finding;
    /** @deprecated Use extractEvents instead */
    getEvents(entry: StitchedEntry | Event[]): Event[];
    /** @deprecated Use buildFinding instead */
    createFinding(opts: FindingInput): Finding;
    /** @deprecated Use filterEventsByDateRange instead */
    filterEventsByDate(e: Event[], d: string | Date, u?: 'day' | 'month' | 'year'): Event[];
}
export default BaseDetector;
//# sourceMappingURL=BaseDetector.d.ts.map