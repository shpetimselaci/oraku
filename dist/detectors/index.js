"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDetector = exports.RecommendationDetector = exports.DetectorManager = exports.GroqFallbackDetector = exports.ActivityPatternAnalyzer = exports.StreakDetector = exports.ChecklistDetector = exports.BaseDetector = void 0;
const ActivityPatternAnalyzer_1 = require("./ActivityPatternAnalyzer");
const RecommendationDetector_1 = require("./RecommendationDetector");
const GroqFallbackDetector_1 = require("./GroqFallbackDetector");
// Re-export all detectors and types
var BaseDetector_1 = require("./BaseDetector");
Object.defineProperty(exports, "BaseDetector", { enumerable: true, get: function () { return BaseDetector_1.BaseDetector; } });
var ChecklistDetector_1 = require("./ChecklistDetector");
Object.defineProperty(exports, "ChecklistDetector", { enumerable: true, get: function () { return ChecklistDetector_1.ChecklistDetector; } });
var StreakDetector_1 = require("./StreakDetector");
Object.defineProperty(exports, "StreakDetector", { enumerable: true, get: function () { return StreakDetector_1.StreakDetector; } });
var ActivityPatternAnalyzer_2 = require("./ActivityPatternAnalyzer");
Object.defineProperty(exports, "ActivityPatternAnalyzer", { enumerable: true, get: function () { return ActivityPatternAnalyzer_2.ActivityPatternAnalyzer; } });
var GroqFallbackDetector_2 = require("./GroqFallbackDetector");
Object.defineProperty(exports, "GroqFallbackDetector", { enumerable: true, get: function () { return GroqFallbackDetector_2.GroqFallbackDetector; } });
var DetectorManager_1 = require("./DetectorManager");
Object.defineProperty(exports, "DetectorManager", { enumerable: true, get: function () { return DetectorManager_1.DetectorManager; } });
// RecommendationDetector is a post-processing stage (runs after all detectors, reads findings)
// It is not included in the default detectors array
var RecommendationDetector_2 = require("./RecommendationDetector");
Object.defineProperty(exports, "RecommendationDetector", { enumerable: true, get: function () { return RecommendationDetector_2.RecommendationDetector; } });
var createDetector_1 = require("./createDetector");
Object.defineProperty(exports, "createDetector", { enumerable: true, get: function () { return createDetector_1.createDetector; } });
__exportStar(require("./EventCounter"), exports);
// ActivityPatternAnalyzer runs first (fast, rule-based)
// RecommendationDetector aggregates across all users and fires in finalize()
// GroqFallbackDetector (LLM) is fallback - only runs if analyzer finds nothing
const detectors = [new ActivityPatternAnalyzer_1.ActivityPatternAnalyzer(), new RecommendationDetector_1.RecommendationDetector(), new GroqFallbackDetector_1.GroqFallbackDetector()];
exports.default = detectors;
//# sourceMappingURL=index.js.map