"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectorManager = void 0;
const index_1 = __importDefault(require("./index"));
const ContextBasedFilter_1 = require("../detectors-filter/ContextBasedFilter");
class DetectorManager {
    options;
    detectors;
    filterMechanism;
    globalContext;
    constructor(options = {}) {
        this.options = options;
        // Load all detectors
        let detectors = index_1.default;
        // Optional: filter by specific detector name
        if (this.options.only) {
            detectors = detectors.filter((detector) => detector.name === this.options.only);
        }
        this.detectors = detectors;
        this.filterMechanism =
            this.options.filterMechanism || new ContextBasedFilter_1.ContextBasedFilter();
        this.globalContext = this.options.context || {};
    }
    async runOnStitched(stitchedData) {
        // Track which detectors actually ran (for finalize)
        const executedDetectors = new Set();
        // Separate primary and fallback detectors
        const primaryDetectors = this.detectors.filter((d) => !d.isFallback);
        const fallbackDetectors = this.detectors.filter((d) => d.isFallback);
        const entryPromises = Object.values(stitchedData).map(async (stitchedEntry) => {
            const events = Array.isArray(stitchedEntry?.events)
                ? stitchedEntry.events
                : [];
            const categories = Array.from(new Set(events
                .map((e) => (e && e.category) || '')
                .filter(Boolean)));
            const context = { ...this.globalContext };
            if (categories.length === 1) {
                context.category = categories[0];
            }
            const selectedPrimary = this.filterMechanism.filter(primaryDetectors, stitchedEntry, context);
            // Run primary detectors first
            let entryFindings = [];
            for (const detector of selectedPrimary) {
                try {
                    executedDetectors.add(detector);
                    const results = await detector.detect(stitchedEntry);
                    if (Array.isArray(results))
                        entryFindings.push(...results);
                }
                catch {
                    // Silently ignore detector errors
                }
            }
            // If primary found nothing, run fallback detectors
            if (entryFindings.length === 0 && fallbackDetectors.length > 0) {
                for (const detector of fallbackDetectors) {
                    try {
                        executedDetectors.add(detector);
                        const results = await detector.detect(stitchedEntry);
                        if (Array.isArray(results))
                            entryFindings.push(...results);
                    }
                    catch {
                        // Silently ignore detector errors
                    }
                }
            }
            return entryFindings;
        });
        const findingsNested = await Promise.all(entryPromises);
        let findings = findingsNested.flat();
        // Call finalize() only on detectors that actually ran
        for (const detector of executedDetectors) {
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
        // Deduplicate findings by id
        const seen = new Set();
        findings = findings.filter((finding) => {
            if (!finding?.id || seen.has(finding.id))
                return false;
            seen.add(finding.id);
            return true;
        });
        return findings;
    }
}
exports.DetectorManager = DetectorManager;
exports.default = DetectorManager;
//# sourceMappingURL=DetectorManager.js.map