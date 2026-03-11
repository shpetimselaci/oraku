"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDetector = void 0;
const crypto_1 = require("crypto");
/**
 * Optimized BaseDetector
 * Focuses on O(n) performance and minimal Garbage Collection pressure.
 */
class BaseDetector {
    name;
    description;
    dataSource;
    severity;
    isFallback;
    constructor(config = {}) {
        // Falls back to class name if no name is provided
        this.name = config.name || this.constructor.name;
        this.description = config.description || '';
        this.dataSource = config.dataSource || null;
        this.severity = config.severity || 'info';
    }
    /**
     * Normalizes input into a flat Event array.
     */
    extractEvents(entry) {
        if (Array.isArray(entry))
            return entry;
        return entry?.events ?? [];
    }
    /**
     * Safe conversion of various date representations into a Date object.
     * Returns null for invalid or missing values. Used by downstream detectors.
     */
    toDate(value) {
        if (!value)
            return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    // ============ Optimized Date Utilities ============
    /**
     * Checks if a date string matches today's ISO date (YYYY-MM-DD).
     * Uses string comparison to avoid heavy Date object instantiation in loops.
     */
    isDateToday(dateValue) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const targetStr = typeof dateValue === 'string'
            ? dateValue.slice(0, 10)
            : dateValue.toISOString().slice(0, 10);
        return targetStr === todayStr;
    }
    /**
     * Highly efficient filtering by date range.
     * Compares strings rather than creating Date objects for every iteration.
     */
    filterEventsByDateRange(events, targetDate, unit = 'day') {
        const target = new Date(targetDate);
        if (isNaN(target.getTime()))
            return [];
        const isoTarget = target.toISOString();
        // Determine how many characters to compare: 
        // Day: 10 (YYYY-MM-DD), Month: 7 (YYYY-MM), Year: 4 (YYYY)
        const sliceLen = unit === 'day' ? 10 : unit === 'month' ? 7 : 4;
        const matchStr = isoTarget.slice(0, sliceLen);
        return events.filter((ev) => {
            const dateStr = ev.createdAt || ev.date;
            if (!dateStr)
                return false;
            // Fast string comparison
            if (typeof dateStr === 'string') {
                return dateStr.startsWith(matchStr);
            }
            // fallback: try parsing it as a date object/string, guarding against invalid values
            const parsed = new Date(dateStr);
            return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(matchStr);
        });
    }
    // ============ Finding Builder ============
    /**
     * Builds a finding with a guaranteed unique ID.
     */
    buildFinding(input) {
        const { id, message, evidence = {}, severity, ...extra } = input;
        return {
            // Prioritize provided ID, then random UUID to prevent collisions in high-speed loops
            id: id ?? `${this.name.toLowerCase()}-${(0, crypto_1.randomUUID)()}`,
            detector: this.name,
            severity: severity || this.severity,
            message,
            evidence,
            ...extra
        };
    }
    // ============ Legacy Aliases (@deprecated) ============
    /** @deprecated Use extractEvents instead */
    getEvents(entry) { return this.extractEvents(entry); }
    /** @deprecated Use buildFinding instead */
    createFinding(opts) { return this.buildFinding(opts); }
    /** @deprecated Use filterEventsByDateRange instead */
    filterEventsByDate(e, d, u) {
        return this.filterEventsByDateRange(e, d, u);
    }
}
exports.BaseDetector = BaseDetector;
exports.default = BaseDetector;
//# sourceMappingURL=BaseDetector.js.map