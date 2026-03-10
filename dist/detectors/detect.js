"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = detect;
const StreakDetector_1 = require("./StreakDetector");
const ChecklistDetector_1 = require("./ChecklistDetector");
const detectors = [];
/**
 * Declarative detector builder - auto-infers detector type from filter
 *
 * Usage:
 *   detect('curriculum | today | missing(reading, play, art)')
 *   detect({ source: 'nutrition', when: 'today', missing: ['vitamin-a', 'iron'] })
 *   detect({ source: 'routine', repeats: 3 })
 *   detect({ source: 'routine', breaks: 5, severity: 'warning' })
 */
function detect(filter) {
    const config = typeof filter === 'string' ? parseFilterString(filter) : filter;
    // Auto-infer detector type from filter keywords
    const type = inferType(config);
    const detector = buildDetector(type, config);
    detectors.push(detector);
    return detector;
}
function parseFilterString(str) {
    const config = {};
    const parts = str.split('|').map((p) => p.trim());
    for (const part of parts) {
        // source (first plain word)
        if (!config.source && /^[a-z]+$/i.test(part)) {
            config.source = part;
            continue;
        }
        // when: today, week, month
        if (/^today$/i.test(part)) {
            config.when = 'today';
            continue;
        }
        if (/^week$/i.test(part)) {
            config.when = 'week';
            continue;
        }
        // missing(item1, item2, ...)
        const missingMatch = part.match(/^missing\((.+)\)$/i);
        if (missingMatch) {
            config.missing = missingMatch[1].split(',').map((s) => s.trim());
            continue;
        }
        // repeats(n) or repeats(n+)
        const repeatsMatch = part.match(/^repeats\((\d+)\+?\)$/i);
        if (repeatsMatch) {
            config.repeats = parseInt(repeatsMatch[1]);
            continue;
        }
        // breaks(n) or breaks(n+)
        const breaksMatch = part.match(/^breaks\((\d+)\+?\)$/i);
        if (breaksMatch) {
            config.breaks = parseInt(breaksMatch[1]);
            continue;
        }
        // severity: warn, warning, info, success
        if (/^warn(ing)?$/i.test(part)) {
            config.severity = 'warning';
            continue;
        }
        if (/^info$/i.test(part)) {
            config.severity = 'info';
            continue;
        }
        // message: "..."
        const msgMatch = part.match(/^["'](.+)["']$/);
        if (msgMatch) {
            config.message = msgMatch[1];
            continue;
        }
    }
    return config;
}
function inferType(config) {
    if (config.missing)
        return 'checklist';
    if (config.expected)
        return 'checklist';
    if (config.repeats)
        return 'streak-ongoing';
    if (config.breaks)
        return 'streak-break';
    // Default to checklist if we have a source
    if (config.source)
        return 'checklist';
    throw new Error('Cannot infer detector type from filter');
}
function buildDetector(type, config) {
    const name = config.name || `${config.source || 'auto'}-${type}-detector`;
    if (type === 'checklist') {
        return new ChecklistDetector_1.ChecklistDetector({
            name,
            dataSource: config.source,
            severity: config.severity || 'info',
            todayOnly: config.when === 'today',
            dateFilter: buildDateFilter(config.when),
            aggregate: config.when === 'week',
            expectedItems: buildExpectedItems(config.missing || config.expected || []),
            extractActual: config.extract ||
                ((e) => e.name?.toLowerCase() || e.log?.toLowerCase() || ''),
            matchFn: config.match || defaultMatch,
            message: config.message || ((missing) => `Missing: ${missing.join(', ')}`)
        });
    }
    if (type === 'streak-ongoing') {
        const msg = config.message;
        return new StreakDetector_1.StreakDetector({
            name,
            dataSource: config.source,
            severity: config.severity || 'info',
            minRepeat: config.repeats || 3,
            triggerOn: 'ongoing',
            message: msg ? () => msg : undefined
        });
    }
    if (type === 'streak-break') {
        const msg = config.message;
        return new StreakDetector_1.StreakDetector({
            name,
            dataSource: config.source,
            severity: config.severity || 'warning',
            minRepeat: config.breaks || 5,
            triggerOn: 'break',
            message: msg ? () => msg : undefined
        });
    }
    throw new Error(`Unknown detector type: ${type}`);
}
function buildDateFilter(when) {
    if (!when || when === 'today')
        return null; // todayOnly handles this
    if (when === 'week') {
        return { unit: 'day', value: 0 }; // 'week' not supported as unit, using day
    }
    if (when === 'month') {
        return { unit: 'month', value: 0 };
    }
    return null;
}
function buildExpectedItems(items) {
    return items.map((item) => {
        if (typeof item === 'string') {
            // Auto-generate keywords from item name
            return {
                key: item,
                keywords: [item.toLowerCase()]
            };
        }
        return item;
    });
}
function defaultMatch(actual, expected) {
    const lowerActual = actual.toLowerCase();
    // Check keywords
    if (expected.keywords) {
        return expected.keywords.some((k) => lowerActual.includes(k.toLowerCase()));
    }
    // Check regex
    if (expected.match instanceof RegExp) {
        return expected.match.test(actual);
    }
    // Check key
    return lowerActual.includes(expected.key.toLowerCase());
}
// Attach static methods
detect.getAll = () => detectors;
detect.clear = () => {
    detectors.length = 0;
};
exports.default = detect;
//# sourceMappingURL=detect.js.map