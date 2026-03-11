"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBasedFilter = void 0;
const BaseDetectorFilter_1 = require("./BaseDetectorFilter");
const EventCounter_1 = require("../detectors/EventCounter");
class ContextBasedFilter extends BaseDetectorFilter_1.BaseDetectorFilter {
    filter(detectors, group, context = {}) {
        const events = Array.isArray(group?.events) ? group.events : [];
        const { count: mostCommonCount } = (0, EventCounter_1.getTopPattern)((0, EventCounter_1.countPatterns)(events));
        return detectors.filter((d) => {
            const detector = d;
            if (detector.minEvents && events.length < detector.minEvents) {
                return false;
            }
            if (detector.requiresRecurring &&
                detector.recurringThreshold &&
                mostCommonCount < detector.recurringThreshold) {
                return false;
            }
            if (detector.supportedCategories &&
                context.category &&
                !detector.supportedCategories.includes(context.category)) {
                return false;
            }
            return true;
        });
    }
}
exports.ContextBasedFilter = ContextBasedFilter;
exports.default = ContextBasedFilter;
//# sourceMappingURL=ContextBasedFilter.js.map