"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistDetector = void 0;
const BaseDetector_1 = require("./BaseDetector");
class ChecklistDetector extends BaseDetector_1.BaseDetector {
    expectedItems;
    extractActual;
    matchFn;
    compareFn;
    messageFn;
    todayOnly;
    dateFilter;
    aggregate;
    _aggregatedItems;
    constructor(config) {
        super(config);
        this.expectedItems = config.expectedItems || [];
        this.extractActual = config.extractActual || ((e) => e.name?.toLowerCase() || '');
        this.matchFn = config.matchFn || null;
        this.compareFn = config.compareFn || null;
        this.messageFn = config.message || ((missing) => `Missing: ${missing.join(', ')}`);
        this.todayOnly = config.todayOnly !== false;
        this.dateFilter = config.dateFilter || null;
        this.aggregate = config.aggregate || false;
        this._aggregatedItems = [];
    }
    async detect(entry) {
        let events = this.getEvents(entry);
        if (!events.length)
            return [];
        // Filter by date
        if (this.todayOnly) {
            // use optimized method from BaseDetector
            events = this.filterEventsByDateRange(events, new Date(), 'day');
        }
        else if (this.dateFilter) {
            events = this._filterByDateRange(events, this.dateFilter);
        }
        if (!events.length)
            return [];
        const actualItems = events
            .flatMap((e) => {
            const extracted = this.extractActual(e);
            return Array.isArray(extracted) ? extracted : [extracted];
        })
            .filter(Boolean);
        if (!actualItems.length)
            return [];
        // If aggregating, collect and return empty (finalize later)
        if (this.aggregate) {
            this._aggregatedItems.push(...actualItems);
            return [];
        }
        return this._buildFindings(actualItems, entry);
    }
    // Called after all entries processed (for aggregate mode)
    async finalize() {
        if (!this.aggregate || !this._aggregatedItems.length)
            return [];
        const findings = await this._buildFindings(this._aggregatedItems, null);
        this._aggregatedItems = [];
        return findings;
    }
    async _buildFindings(actualItems, entry) {
        let covered = new Set();
        let missing = [];
        if (this.compareFn) {
            const result = await this.compareFn(actualItems, this.expectedItems, []);
            covered = result.covered || new Set();
            missing = result.missing || [];
        }
        else {
            const normalizedActual = actualItems.map((a) => typeof a === 'string' ? a.toLowerCase() : a);
            for (const expected of this.expectedItems) {
                const isMatched = this.matchFn && typeof this.matchFn === 'function'
                    ? normalizedActual.some((actual) => this.matchFn ? this.matchFn(actual, expected) : false)
                    : normalizedActual.some((actual) => expected.keywords?.some((k) => actual.includes(k)) ||
                        actual.includes(expected.key?.toLowerCase()));
                if (isMatched)
                    covered.add(expected.key);
            }
            missing = this.expectedItems
                .map((e) => e.key)
                .filter((key) => !covered.has(key));
        }
        if (!missing.length)
            return [];
        const identifier = entry?.externalRef || (this.aggregate ? 'weekly' : 'check');
        const dateStr = new Date().toISOString().slice(0, 10);
        return [
            this.buildFinding({
                id: `${this.name.toLowerCase()}-${identifier}-${dateStr}`,
                severity: this.severity,
                message: typeof this.messageFn === 'function'
                    ? this.messageFn(missing)
                    : this.messageFn,
                evidence: {
                    checked: [...new Set(actualItems)],
                    covered: Array.from(covered),
                    missing
                }
            })
        ];
    }
    _filterByDateRange(events, filter) {
        const now = new Date();
        let target;
        switch (filter.unit) {
            case 'day':
                target = new Date(now);
                target.setDate(target.getDate() + filter.value);
                break;
            case 'month':
                target = new Date(now);
                target.setMonth(target.getMonth() + filter.value);
                break;
            case 'year':
                target = new Date(now);
                target.setFullYear(target.getFullYear() + filter.value);
                break;
            default:
                target = now;
        }
        const targetStr = target.toISOString().slice(0, 10);
        return events.filter((ev) => {
            const dateStr = ev.createdAt || ev.date;
            if (!dateStr)
                return false;
            switch (filter.unit) {
                case 'day':
                    return dateStr.slice(0, 10) === targetStr;
                case 'month':
                    return dateStr.slice(0, 7) === targetStr.slice(0, 7);
                case 'year':
                    return dateStr.slice(0, 4) === targetStr.slice(0, 4);
                default:
                    return false;
            }
        });
    }
}
exports.ChecklistDetector = ChecklistDetector;
exports.default = ChecklistDetector;
//# sourceMappingURL=ChecklistDetector.js.map