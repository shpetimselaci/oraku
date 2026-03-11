import type { EventGroup, Event, Finding, FindingData, Severity, DetectorConfig, Detector } from '../types';
export declare abstract class BaseDetector implements Detector {
    readonly name: string;
    readonly description: string;
    readonly dataSource: string | null;
    readonly severity: Severity;
    isFallback?: boolean;
    constructor(config?: DetectorConfig);
    abstract detect(entry: EventGroup): Promise<Finding[]>;
    protected getEvents(entry: EventGroup | Event[]): Event[];
    protected parseDate(value: string | Date | null | undefined): Date | null;
    isToday(dateValue: string | Date): boolean;
    filterByDate(events: Event[], targetDate: string | Date, unit?: 'day' | 'month' | 'year'): Event[];
    createFinding(findingData: FindingData): Finding;
}
export default BaseDetector;
//# sourceMappingURL=BaseDetector.d.ts.map