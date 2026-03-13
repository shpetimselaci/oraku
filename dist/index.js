"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNotifications = exports.ContextBasedFilter = exports.BaseDetectorFilter = exports.filterByPattern = exports.getTopPattern = exports.countPatterns = exports.createDetector = exports.DetectorManager = exports.GroqFallbackDetector = exports.RecommendationDetector = exports.ActivityPatternAnalyzer = exports.ChecklistDetector = exports.StreakDetector = exports.BaseDetector = exports.loadJsonRecordsSync = exports.loadJsonRecords = exports.runPipeline = exports.EventStitcher = void 0;
// ─── Core ────────────────────────────────────────────────────────────────────
var EventStitcher_1 = require("./core/EventStitcher");
Object.defineProperty(exports, "EventStitcher", { enumerable: true, get: function () { return EventStitcher_1.EventStitcher; } });
var pipeline_1 = require("./core/pipeline");
Object.defineProperty(exports, "runPipeline", { enumerable: true, get: function () { return pipeline_1.runPipeline; } });
var ingest_1 = require("./ingest");
Object.defineProperty(exports, "loadJsonRecords", { enumerable: true, get: function () { return ingest_1.loadJsonRecords; } });
Object.defineProperty(exports, "loadJsonRecordsSync", { enumerable: true, get: function () { return ingest_1.loadJsonRecordsSync; } });
// ─── Detectors ───────────────────────────────────────────────────────────────
var BaseDetector_1 = require("./detectors/BaseDetector");
Object.defineProperty(exports, "BaseDetector", { enumerable: true, get: function () { return BaseDetector_1.BaseDetector; } });
var StreakDetector_1 = require("./detectors/StreakDetector");
Object.defineProperty(exports, "StreakDetector", { enumerable: true, get: function () { return StreakDetector_1.StreakDetector; } });
var ChecklistDetector_1 = require("./detectors/ChecklistDetector");
Object.defineProperty(exports, "ChecklistDetector", { enumerable: true, get: function () { return ChecklistDetector_1.ChecklistDetector; } });
var ActivityPatternAnalyzer_1 = require("./detectors/ActivityPatternAnalyzer");
Object.defineProperty(exports, "ActivityPatternAnalyzer", { enumerable: true, get: function () { return ActivityPatternAnalyzer_1.ActivityPatternAnalyzer; } });
var RecommendationDetector_1 = require("./detectors/RecommendationDetector");
Object.defineProperty(exports, "RecommendationDetector", { enumerable: true, get: function () { return RecommendationDetector_1.RecommendationDetector; } });
var GroqFallbackDetector_1 = require("./detectors/GroqFallbackDetector");
Object.defineProperty(exports, "GroqFallbackDetector", { enumerable: true, get: function () { return GroqFallbackDetector_1.GroqFallbackDetector; } });
var DetectorManager_1 = require("./detectors/DetectorManager");
Object.defineProperty(exports, "DetectorManager", { enumerable: true, get: function () { return DetectorManager_1.DetectorManager; } });
var createDetector_1 = require("./detectors/createDetector");
Object.defineProperty(exports, "createDetector", { enumerable: true, get: function () { return createDetector_1.createDetector; } });
var EventCounter_1 = require("./detectors/EventCounter");
Object.defineProperty(exports, "countPatterns", { enumerable: true, get: function () { return EventCounter_1.countPatterns; } });
Object.defineProperty(exports, "getTopPattern", { enumerable: true, get: function () { return EventCounter_1.getTopPattern; } });
Object.defineProperty(exports, "filterByPattern", { enumerable: true, get: function () { return EventCounter_1.filterByPattern; } });
// ─── Filters ─────────────────────────────────────────────────────────────────
var BaseDetectorFilter_1 = require("./detectors-filter/BaseDetectorFilter");
Object.defineProperty(exports, "BaseDetectorFilter", { enumerable: true, get: function () { return BaseDetectorFilter_1.BaseDetectorFilter; } });
var ContextBasedFilter_1 = require("./detectors-filter/ContextBasedFilter");
Object.defineProperty(exports, "ContextBasedFilter", { enumerable: true, get: function () { return ContextBasedFilter_1.ContextBasedFilter; } });
// ─── Notifications ───────────────────────────────────────────────────────────
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "generateNotifications", { enumerable: true, get: function () { return notifications_1.generateNotifications; } });
//# sourceMappingURL=index.js.map