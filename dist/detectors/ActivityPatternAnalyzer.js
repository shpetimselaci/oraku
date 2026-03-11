"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityPatternAnalyzer = void 0;
const BaseDetector_1 = require("./BaseDetector");
const StreakDetector_1 = require("./StreakDetector");
const MS_PER_DAY = 86_400_000;
const VARIETY_LOOKBACK_DAYS = 7;
const SUMMARY_LOOKBACK_DAYS = 3;
const MAX_ACTIVITIES_IN_SUMMARY = 3;
class ActivityPatternAnalyzer extends BaseDetector_1.BaseDetector {
    ongoingStreakDetector;
    breakStreakDetector;
    constructor(config = {}) {
        super({ name: 'ActivityPatternAnalyzer', severity: 'info', ...config });
        const minRepeat = config.minStreakLength ?? 3;
        this.ongoingStreakDetector = new StreakDetector_1.StreakDetector({ minRepeat, triggerOn: 'ongoing' });
        this.breakStreakDetector = new StreakDetector_1.StreakDetector({ minRepeat, triggerOn: 'break' });
    }
    async detect(entry) {
        const events = this.getEvents(entry);
        if (!events?.length)
            return [];
        const now = Date.now();
        const [ongoingFindings, breakFindings] = await Promise.all([
            this.ongoingStreakDetector.detect(entry),
            this.breakStreakDetector.detect(entry)
        ]);
        return [
            ...ongoingFindings,
            ...breakFindings,
            ...this.findDormantCategories(events, entry, now),
            ...this.summarizeRecentActivity(events, entry, now)
        ];
    }
    findDormantCategories(events, entry, now) {
        const cutoff = now - VARIETY_LOOKBACK_DAYS * MS_PER_DAY;
        const allCategories = new Map();
        const recentCategories = new Set();
        for (const e of events) {
            const category = e.category;
            if (!category)
                continue;
            allCategories.set(category, (allCategories.get(category) ?? 0) + 1);
            const time = this.getTimestamp(e);
            if (time && time >= cutoff)
                recentCategories.add(category);
        }
        if (!recentCategories.size)
            return [];
        const dormant = [...allCategories.entries()]
            .filter(([cat, count]) => count >= 2 && !recentCategories.has(cat))
            .map(([cat]) => cat);
        if (!dormant.length)
            return [];
        return [
            this.createFinding({
                id: `variety-${entry.externalRef ?? 'auto'}`,
                severity: 'info',
                message: `📋 Not seen this week: ${dormant.join(', ')}`,
                evidence: { type: 'variety', missingCategories: dormant }
            })
        ];
    }
    summarizeRecentActivity(events, entry, now) {
        const cutoff = now - SUMMARY_LOOKBACK_DAYS * MS_PER_DAY;
        const seen = new Set();
        const recentActivities = [];
        for (const e of events) {
            const time = this.getTimestamp(e);
            if (!time || time < cutoff)
                continue;
            const name = (e.name ?? e.log)?.trim();
            if (!name)
                continue;
            const key = name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                recentActivities.push(name);
            }
        }
        if (!recentActivities.length)
            return [];
        const shown = recentActivities.slice(0, MAX_ACTIVITIES_IN_SUMMARY);
        const remaining = recentActivities.length - shown.length;
        return [
            this.createFinding({
                id: `summary-${entry.externalRef ?? 'auto'}`,
                severity: 'success',
                message: `✅ Recent: ${shown.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}`,
                evidence: { type: 'summary', count: recentActivities.length, activities: recentActivities }
            })
        ];
    }
    getTimestamp(e) {
        const raw = e.createdAt ?? e.date;
        if (!raw)
            return null;
        const t = new Date(raw).getTime();
        return Number.isNaN(t) ? null : t;
    }
}
exports.ActivityPatternAnalyzer = ActivityPatternAnalyzer;
exports.default = ActivityPatternAnalyzer;
//# sourceMappingURL=ActivityPatternAnalyzer.js.map