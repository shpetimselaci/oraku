"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStitcher = void 0;
class EventStitcher {
    events;
    options;
    constructor(events = [], options = {}) {
        this.events = events;
        this.options = options;
    }
    setEvents(events) {
        this.events = events;
    }
    resolveField(obj, fieldPath) {
        if (!obj)
            return undefined;
        if (Array.isArray(fieldPath)) {
            for (const subPath of fieldPath) {
                const value = this.resolveField(obj, subPath);
                if (value !== undefined && value !== null)
                    return value;
            }
            return undefined;
        }
        const pathParts = String(fieldPath).split('.');
        let current = obj;
        for (const part of pathParts) {
            if (current == null)
                return undefined;
            current = current[part];
        }
        return current;
    }
    stitchByField(field) {
        const stitchedMap = {};
        for (const event of this.events) {
            let groupKey = this.resolveField(event, field);
            if (groupKey === undefined || groupKey === null)
                groupKey = 'unknown';
            if (typeof groupKey === 'object')
                groupKey = JSON.stringify(groupKey);
            const keyString = String(groupKey);
            if (!stitchedMap[keyString]) {
                stitchedMap[keyString] = {
                    externalRef: keyString,
                    events: [],
                    first: null,
                    last: null,
                    count: 0,
                    _refs: new Set()
                };
            }
            const stitchedEntry = stitchedMap[keyString];
            const meta = event.meta;
            const externalRefOrFallback = event.externalRef || meta?.externalRef || meta?.external_ref || JSON.stringify(event);
            if (stitchedEntry._refs.has(String(externalRefOrFallback)))
                continue;
            stitchedEntry._refs.add(String(externalRefOrFallback));
            stitchedEntry.events.push(event);
            stitchedEntry.count = stitchedEntry.events.length;
            const timestamp = event.createdAt ? new Date(event.createdAt).toISOString() : null;
            if (timestamp) {
                if (!stitchedEntry.first || timestamp < stitchedEntry.first)
                    stitchedEntry.first = timestamp;
                if (!stitchedEntry.last || timestamp > stitchedEntry.last)
                    stitchedEntry.last = timestamp;
            }
        }
        const result = {};
        for (const [key, entry] of Object.entries(stitchedMap)) {
            result[key] = {
                externalRef: entry.externalRef,
                events: entry.events,
                count: entry.count,
                ...(entry.first !== null && { first: entry.first }),
                ...(entry.last !== null && { last: entry.last })
            };
        }
        return result;
    }
    stitchByExternalRef() {
        return this.stitchByField(['externalRef', 'meta.userId', 'meta.externalRef']);
    }
    stitch(opts = {}) {
        const groupBy = opts.groupBy || this.options.groupBy || ['externalRef', 'meta.userId', 'meta.externalRef'];
        return this.stitchByField(groupBy);
    }
    toMarkdown(entry) {
        const lines = [];
        lines.push(`# Stitched summary — ${entry.externalRef}`);
        lines.push(`- events: ${entry.count}`);
        if (entry.first)
            lines.push(`- first: ${entry.first}`);
        if (entry.last)
            lines.push(`- last: ${entry.last}`);
        lines.push('\n## Sample events');
        const sample = (entry.events || []).slice(0, 5).map((e) => {
            const time = e?.createdAt ?? 'unknown';
            const action = e?.log ?? e?.action ?? JSON.stringify(e?.meta ?? {});
            return `- ${time} — ${action}`;
        });
        lines.push(...sample);
        return lines.join('\n');
    }
}
exports.EventStitcher = EventStitcher;
exports.default = EventStitcher;
//# sourceMappingURL=EventStitcher.js.map