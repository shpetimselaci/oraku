"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countPatterns = countPatterns;
exports.getTopPattern = getTopPattern;
exports.filterByPattern = filterByPattern;
function countPatterns(events) {
    const counts = {};
    for (const e of events) {
        const key = `${e?.category || ''}|${e?.subcategory || ''}`;
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}
function getTopPattern(counts) {
    let top = { key: null, count: 0 };
    for (const [key, count] of Object.entries(counts)) {
        if (count > top.count)
            top = { key, count };
    }
    return top;
}
function filterByPattern(events, patternKey) {
    const [cat, sub] = patternKey.split('|');
    return events.filter((e) => e?.category === cat && e?.subcategory === sub);
}
exports.default = { countPatterns, getTopPattern, filterByPattern };
//# sourceMappingURL=EventCounter.js.map