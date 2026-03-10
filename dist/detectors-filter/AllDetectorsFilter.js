"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllDetectorsFilter = void 0;
const MechanismToFilterDetectors_1 = require("./MechanismToFilterDetectors");
class AllDetectorsFilter extends MechanismToFilterDetectors_1.MechanismToFilterDetectors {
    filter(detectors) {
        return detectors;
    }
}
exports.AllDetectorsFilter = AllDetectorsFilter;
exports.default = AllDetectorsFilter;
//# sourceMappingURL=AllDetectorsFilter.js.map