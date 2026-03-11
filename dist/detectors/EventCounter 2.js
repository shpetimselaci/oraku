"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countByType = countByType;
exports.getMostFrequent = getMostFrequent;
exports.filterByType = filterByType;
function countByType(events) {
    const counts = {};
    for (const e of events) {
        const key = `${e?.category || ''}|${e?.subcategory || ''}`;
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}
function getMostFrequent(counts) {
    let top = { key: null, count: 0 };
    for (const [key, count] of Object.entries(counts)) {
        if (count > top.count)
            top = { key, count };
    }
    return top;
}
function filterByType(events, typeKey) {
    const [cat, sub] = typeKey.split('|');
    return events.filter((e) => e?.category === cat && e?.subcategory === sub);
}
exports.default = { countByType, getMostFrequent, filterByType };
//# sourceMappingURL=EventCounter.js.map