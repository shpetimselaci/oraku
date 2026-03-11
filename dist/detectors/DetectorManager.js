"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectorManager = void 0;
const index_1 = __importDefault(require("./index"));
const createDetector_1 = require("./createDetector");
const ContextBasedFilter_1 = require("../detectors-filter/ContextBasedFilter");
class DetectorManager {
    detectors;
    filterMechanism;
    context;
    constructor(options = {}) {
        let detectors = [...index_1.default, ...createDetector_1.createDetector.getAll()];
        if (options.only) {
            detectors = detectors.filter((d) => d.name === options.only);
        }
        this.detectors = detectors;
        this.filterMechanism = options.filterMechanism || new ContextBasedFilter_1.ContextBasedFilter();
        this.context = options.context || {};
    }
    async runDetectorsOn(eventGroups) {
        const triggeredDetectors = new Set();
        const primaryDetectors = this.detectors.filter((d) => !d.isFallback);
        const fallbackDetectors = this.detectors.filter((d) => d.isFallback);
        const groupDetectionTasks = Object.values(eventGroups).map(async (group) => {
            const events = Array.isArray(group?.events) ? group.events : [];
            const categories = Array.from(new Set(events.map((e) => (e && e.category) || '').filter(Boolean)));
            const groupContext = { ...this.context };
            if (categories.length === 1)
                groupContext.category = categories[0];
            const selectedPrimaryDetectors = this.filterMechanism.filter(primaryDetectors, group, groupContext);
            let groupFindings = [];
            for (const detector of selectedPrimaryDetectors) {
                try {
                    triggeredDetectors.add(detector);
                    const results = await detector.detect(group);
                    if (Array.isArray(results))
                        groupFindings.push(...results);
                }
                catch (err) {
                    console.warn('[DetectorManager] Detector error:', detector.name, err?.message);
                }
            }
            if (groupFindings.length === 0 && fallbackDetectors.length > 0) {
                for (const detector of fallbackDetectors) {
                    try {
                        triggeredDetectors.add(detector);
                        const results = await detector.detect(group);
                        if (Array.isArray(results))
                            groupFindings.push(...results);
                    }
                    catch {
                        // silently ignore fallback errors
                    }
                }
            }
            return groupFindings;
        });
        const findingsByGroup = await Promise.all(groupDetectionTasks);
        let findings = findingsByGroup.flat();
        for (const detector of triggeredDetectors) {
            if (detector.finalize) {
                try {
                    const finalFindings = await detector.finalize();
                    if (Array.isArray(finalFindings))
                        findings = findings.concat(finalFindings);
                }
                catch (err) {
                    console.error('Detector finalize error', detector.name, err?.message);
                }
            }
        }
        const seenFindingIds = new Set();
        findings = findings.filter((finding) => {
            if (!finding?.id || seenFindingIds.has(finding.id))
                return false;
            seenFindingIds.add(finding.id);
            return true;
        });
        return findings;
    }
}
exports.DetectorManager = DetectorManager;
exports.default = DetectorManager;
//# sourceMappingURL=DetectorManager.js.map