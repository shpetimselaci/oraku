"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBasedFilter = void 0;
const MechanismToFilterDetectors_1 = require("./MechanismToFilterDetectors");
const EventCounter_1 = require("../detectors/EventCounter");
class ContextBasedFilter extends MechanismToFilterDetectors_1.MechanismToFilterDetectors {
    filter(detectors, stitchedEntry, context = {}) {
        const events = Array.isArray(stitchedEntry?.events)
            ? stitchedEntry.events
            : [];
        const { count: mostCommonCount } = (0, EventCounter_1.getMostFrequent)((0, EventCounter_1.countByType)(events));
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