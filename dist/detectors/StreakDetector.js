"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakDetector = void 0;
const BaseDetector_1 = require("./BaseDetector");
const EventCounter_1 = require("./EventCounter");
class StreakDetector extends BaseDetector_1.BaseDetector {
    minRepeat;
    triggerOn;
    messageFormatter;
    constructor(config) {
        super(config);
        this.minRepeat = config.minRepeat || 3;
        this.triggerOn = config.triggerOn || 'ongoing';
        this.messageFormatter = config.message;
    }
    predictNextDate(sortedEvents) {
        if (sortedEvents.length < 2)
            return null;
        const intervals = [];
        for (let i = 1; i < sortedEvents.length; i++) {
            intervals.push(sortedEvents[i]._date.getTime() - sortedEvents[i - 1]._date.getTime());
        }
        intervals.sort((a, b) => a - b);
        const mid = Math.floor(intervals.length / 2);
        const median = intervals.length % 2
            ? intervals[mid]
            : (intervals[mid - 1] + intervals[mid]) / 2;
        return new Date(sortedEvents[sortedEvents.length - 1]._date.getTime() + median);
    }
    buildMessage(data) {
        if (this.messageFormatter) {
            return this.messageFormatter(`${data.category}/${data.subcategory}`).replace('{{next}}', data.predictedDate?.split('T')[0] || 'soon');
        }
        return this.triggerOn === 'break'
            ? `${data.category}/${data.subcategory} stopped unexpectedly`
            : `Predicted next ${data.category}/${data.subcategory}: ${data.predictedDate?.split('T')[0]}`;
    }
    async detect(entry) {
        const events = this.getEvents(entry);
        if (events.length < this.minRepeat)
            return [];
        const counts = (0, EventCounter_1.countPatterns)(events);
        const now = new Date();
        const findings = [];
        for (const [patternKey, count] of Object.entries(counts)) {
            if (count < this.minRepeat)
                continue;
            const sorted = (0, EventCounter_1.filterByPattern)(events, patternKey)
                .map((e) => {
                const d = this.parseDate(e.createdAt || e.date || '');
                return { ...e, _date: d ?? new Date(NaN) };
            })
                .filter((e) => !isNaN(e._date.getTime()))
                .sort((a, b) => a._date.getTime() - b._date.getTime());
            if (sorted.length < this.minRepeat)
                continue;
            const predicted = this.predictNextDate(sorted);
            if (!predicted)
                continue;
            const [category, subcategory] = patternKey.split('|');
            const messageData = { category, subcategory, predictedDate: predicted.toISOString() };
            const evidence = sorted.map((e) => ({ ref: e.externalRef, date: e.createdAt, log: e.log }));
            const safeKey = patternKey.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (this.triggerOn === 'ongoing' && predicted > now) {
                findings.push(this.createFinding({
                    id: `recurring-${entry.externalRef}-${safeKey}`,
                    message: this.buildMessage(messageData),
                    evidence: { key: entry.externalRef, predicted: predicted.toISOString(), events: evidence }
                }));
            }
            if (this.triggerOn === 'break' && predicted < now) {
                const hasEventAfterPredicted = sorted.some((e) => {
                    return e._date > predicted;
                });
                if (!hasEventAfterPredicted) {
                    findings.push(this.createFinding({
                        id: `anomaly-${entry.externalRef}-${safeKey}`,
                        severity: 'warning',
                        message: this.buildMessage(messageData),
                        evidence: { key: entry.externalRef, expected: predicted.toISOString(), events: evidence }
                    }));
                }
            }
        }
        return findings;
    }
}
exports.StreakDetector = StreakDetector;
exports.default = StreakDetector;
//# sourceMappingURL=StreakDetector.js.map