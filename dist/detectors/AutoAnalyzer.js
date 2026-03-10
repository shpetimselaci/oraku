"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoAnalyzer = void 0;
const BaseDetector_1 = require("./BaseDetector");
const StreakDetector_1 = require("./StreakDetector");
const MS_PER_DAY = 86_400_000;
const VARIETY_LOOKBACK_DAYS = 7;
const SUMMARY_LOOKBACK_DAYS = 3;
const MAX_ACTIVITIES_IN_SUMMARY = 3;
class AutoAnalyzer extends BaseDetector_1.BaseDetector {
    streakDetector;
    breakDetector;
    constructor(config = {}) {
        super({ name: 'AutoAnalyzer', severity: 'info', ...config });
        const minRepeat = config.minStreakLength ?? 3;
        this.streakDetector = new StreakDetector_1.StreakDetector({
            minRepeat,
            triggerOn: 'ongoing'
        });
        this.breakDetector = new StreakDetector_1.StreakDetector({
            minRepeat,
            triggerOn: 'break'
        });
    }
    async detect(entry) {
        const events = this.getEvents(entry);
        if (!events?.length)
            return [];
        const now = Date.now();
        const [streakFindings, breakFindings] = await Promise.all([
            this.streakDetector.detect(entry),
            this.breakDetector.detect(entry)
        ]);
        return [
            ...streakFindings,
            ...breakFindings,
            ...this.detectMissingVariety(events, entry, now),
            ...this.detectRecentSummary(events, entry, now)
        ];
    }
    // ---------- Variety ----------
    detectMissingVariety(events, entry, now) {
        const cutoff = now - VARIETY_LOOKBACK_DAYS * MS_PER_DAY;
        const allCategories = new Map();
        const recentCategories = new Set();
        for (const e of events) {
            const category = e.category;
            if (!category)
                continue;
            allCategories.set(category, (allCategories.get(category) ?? 0) + 1);
            const time = this.safeTimestamp(e);
            if (time && time >= cutoff) {
                recentCategories.add(category);
            }
        }
        if (!recentCategories.size)
            return [];
        const missing = [...allCategories.entries()]
            .filter(([cat, count]) => count >= 2 && !recentCategories.has(cat))
            .map(([cat]) => cat);
        if (!missing.length)
            return [];
        return [
            this.createFinding({
                id: `variety-${entry.externalRef ?? 'auto'}`,
                severity: 'info',
                message: `📋 Not seen this week: ${missing.join(', ')}`,
                evidence: { type: 'variety', missingCategories: missing }
            })
        ];
    }
    // ---------- Summary ----------
    detectRecentSummary(events, entry, now) {
        const cutoff = now - SUMMARY_LOOKBACK_DAYS * MS_PER_DAY;
        const recentActivities = new Set();
        for (const e of events) {
            const time = this.safeTimestamp(e);
            if (!time || time < cutoff)
                continue;
            const name = (e.name ?? e.log)?.toLowerCase().trim();
            if (name)
                recentActivities.add(name);
        }
        if (!recentActivities.size)
            return [];
        const activities = [...recentActivities];
        const shown = activities.slice(0, MAX_ACTIVITIES_IN_SUMMARY);
        const remaining = activities.length - shown.length;
        return [
            this.createFinding({
                id: `summary-${entry.externalRef ?? 'auto'}`,
                severity: 'success',
                message: `✅ Recent: ${shown.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}`,
                evidence: { type: 'summary', count: activities.length, activities }
            })
        ];
    }
    // ---------- Helpers ----------
    safeTimestamp(e) {
        const raw = e.createdAt ?? e.date;
        if (!raw)
            return null;
        const t = new Date(raw).getTime();
        return Number.isNaN(t) ? null : t;
    }
}
exports.AutoAnalyzer = AutoAnalyzer;
exports.default = AutoAnalyzer;
//# sourceMappingURL=AutoAnalyzer.js.map