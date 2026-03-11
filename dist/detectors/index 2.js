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
exports.createDetector = exports.detect = exports.RecommendationDetector = exports.DetectorManager = exports.AutoDetector = exports.AutoAnalyzer = exports.StreakDetector = exports.ChecklistDetector = exports.BaseDetector = void 0;
const AutoAnalyzer_1 = require("./AutoAnalyzer");
const AutoDetector_1 = require("./AutoDetector");
// Re-export all detectors and types
var BaseDetector_1 = require("./BaseDetector");
Object.defineProperty(exports, "BaseDetector", { enumerable: true, get: function () { return BaseDetector_1.BaseDetector; } });
var ChecklistDetector_1 = require("./ChecklistDetector");
Object.defineProperty(exports, "ChecklistDetector", { enumerable: true, get: function () { return ChecklistDetector_1.ChecklistDetector; } });
var StreakDetector_1 = require("./StreakDetector");
Object.defineProperty(exports, "StreakDetector", { enumerable: true, get: function () { return StreakDetector_1.StreakDetector; } });
var AutoAnalyzer_2 = require("./AutoAnalyzer");
Object.defineProperty(exports, "AutoAnalyzer", { enumerable: true, get: function () { return AutoAnalyzer_2.AutoAnalyzer; } });
var AutoDetector_2 = require("./AutoDetector");
Object.defineProperty(exports, "AutoDetector", { enumerable: true, get: function () { return AutoDetector_2.AutoDetector; } });
var DetectorManager_1 = require("./DetectorManager");
Object.defineProperty(exports, "DetectorManager", { enumerable: true, get: function () { return DetectorManager_1.DetectorManager; } });
var RecommendationDetector_1 = require("./RecommendationDetector");
Object.defineProperty(exports, "RecommendationDetector", { enumerable: true, get: function () { return RecommendationDetector_1.RecommendationDetector; } });
var detect_1 = require("./detect");
Object.defineProperty(exports, "detect", { enumerable: true, get: function () { return detect_1.detect; } });
var createDetector_1 = require("./createDetector");
Object.defineProperty(exports, "createDetector", { enumerable: true, get: function () { return createDetector_1.createDetector; } });
__exportStar(require("./EventCounter"), exports);
// AutoAnalyzer runs first (fast, rule-based)
// AutoDetector (LLM) is fallback - only runs if analyzer finds nothing
const detectors = [new AutoAnalyzer_1.AutoAnalyzer(), new AutoDetector_1.AutoDetector()];
exports.default = detectors;
//# sourceMappingURL=index.js.map