"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDetector = void 0;
const crypto_1 = require("crypto");
class BaseDetector {
    name;
    description;
    dataSource;
    severity;
    isFallback;
    constructor(config = {}) {
        this.name = config.name || this.constructor.name;
        this.description = config.description || '';
        this.dataSource = config.dataSource || null;
        this.severity = config.severity || 'info';
    }
    getEvents(entry) {
        if (Array.isArray(entry))
            return entry;
        return entry?.events ?? [];
    }
    parseDate(value) {
        if (!value)
            return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    isToday(dateValue) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const targetStr = typeof dateValue === 'string'
            ? dateValue.slice(0, 10)
            : dateValue.toISOString().slice(0, 10);
        return targetStr === todayStr;
    }
    filterByDate(events, targetDate, unit = 'day') {
        const target = new Date(targetDate);
        if (isNaN(target.getTime()))
            return [];
        const sliceLen = unit === 'day' ? 10 : unit === 'month' ? 7 : 4;
        const matchStr = target.toISOString().slice(0, sliceLen);
        return events.filter((ev) => {
            const dateStr = ev.createdAt || ev.date;
            if (!dateStr)
                return false;
            if (typeof dateStr === 'string')
                return dateStr.startsWith(matchStr);
            const parsed = new Date(dateStr);
            return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(matchStr);
        });
    }
    createFinding(findingData) {
        const { id, message, evidence = {}, severity, ...extra } = findingData;
        return {
            id: id ?? `${this.name.toLowerCase()}-${(0, crypto_1.randomUUID)()}`,
            detector: this.name,
            severity: severity || this.severity,
            message,
            evidence,
            ...extra
        };
    }
}
exports.BaseDetector = BaseDetector;
exports.default = BaseDetector;
//# sourceMappingURL=BaseDetector.js.map