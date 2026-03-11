"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakDetector = void 0;
const BaseDetector_1 = require("./BaseDetector");
const EventCounter_1 = require("./EventCounter");
class StreakDetector extends BaseDetector_1.BaseDetector {
    minimumRepetitions;
    triggerMode;
    _messageFn;
    constructor(config) {
        super(config);
        this.minimumRepetitions = config.minRepeat || 3;
        this.triggerMode = config.triggerOn || 'ongoing';
        this._messageFn = config.message;
    }
    predictNext(sortedEvents) {
        if (sortedEvents.length < 2)
            return null;
        const intervals = [];
        for (let i = 1; i < sortedEvents.length; i++) {
            const diff = sortedEvents[i]._date.getTime() - sortedEvents[i - 1]._date.getTime();
            intervals.push(diff);
        }
        intervals.sort((a, b) => a - b);
        const mid = Math.floor(intervals.length / 2);
        const median = intervals.length % 2
            ? intervals[mid]
            : (intervals[mid - 1] + intervals[mid]) / 2;
        const lastDate = sortedEvents[sortedEvents.length - 1]._date;
        return new Date(lastDate.getTime() + median);
    }
    formatMessage(data) {
        if (this._messageFn) {
            return this._messageFn(`${data.category}/${data.subcategory}`).replace('{{next}}', data.predictedDate?.split('T')[0] || 'soon');
        }
        return this.triggerMode === 'break'
            ? `${data.category}/${data.subcategory} stopped unexpectedly`
            : `Predicted next ${data.category}/${data.subcategory}: ${data.predictedDate?.split('T')[0]}`;
    }
    async detect(entry) {
        const events = this.extractEvents(entry);
        if (events.length < this.minimumRepetitions)
            return [];
        const { key, count } = (0, EventCounter_1.getMostFrequent)((0, EventCounter_1.countByType)(events));
        if (!key || count < this.minimumRepetitions)
            return [];
        const sorted = (0, EventCounter_1.filterByType)(events, key)
            .map((e) => {
            const d = this.toDate(e.createdAt || e.date || '');
            return { ...e, _date: d ?? new Date(NaN) };
        })
            .filter((e) => e._date && !isNaN(e._date.getTime()))
            .sort((a, b) => a._date.getTime() - b._date.getTime());
        if (sorted.length < this.minimumRepetitions)
            return [];
        const predicted = this.predictNext(sorted);
        if (!predicted)
            return [];
        const [category, subcategory] = key.split('|');
        const data = {
            category,
            subcategory,
            predictedDate: predicted.toISOString()
        };
        const evidence = sorted.map((e) => ({
            ref: e.externalRef,
            date: e.createdAt,
            log: e.log
        }));
        const now = new Date();
        if (this.triggerMode === 'ongoing' && predicted > now) {
            return [
                this.buildFinding({
                    id: `recurring-${entry.externalRef}`,
                    message: this.formatMessage(data),
                    evidence: {
                        key: entry.externalRef,
                        predicted: predicted.toISOString(),
                        events: evidence
                    }
                })
            ];
        }
        if (this.triggerMode === 'break' && predicted < now) {
            // Check if there's an event after predicted date
            const hasLaterEvent = events.some((e) => {
                const d = this.toDate(e.createdAt || e.date || '');
                return d !== null && d > predicted;
            });
            if (hasLaterEvent)
                return [];
            return [
                this.buildFinding({
                    id: `anomaly-${entry.externalRef}`,
                    severity: 'warning',
                    message: this.formatMessage(data),
                    evidence: {
                        key: entry.externalRef,
                        expected: predicted.toISOString(),
                        events: evidence
                    }
                })
            ];
        }
        return [];
    }
}
exports.StreakDetector = StreakDetector;
exports.default = StreakDetector;
//# sourceMappingURL=StreakDetector.js.map