import type { Event, EventGroup, EventGroupMap } from '../types';
interface StitchOptions {
    groupBy?: string | string[];
}
declare class EventStitcher {
    private events;
    private options;
    constructor(events?: Event[], options?: StitchOptions);
    setEvents(events: Event[]): void;
    resolveField(obj: unknown, fieldPath: string | string[]): unknown;
    stitchByField(field: string | string[]): EventGroupMap;
    stitchByExternalRef(): EventGroupMap;
    stitch(opts?: StitchOptions): EventGroupMap;
    toMarkdown(entry: EventGroup): string;
}
export default EventStitcher;
export { EventStitcher };
//# sourceMappingURL=EventStitcher.d.ts.map