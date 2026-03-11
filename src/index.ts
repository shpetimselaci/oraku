// ─── Core ────────────────────────────────────────────────────────────────────
export { EventStitcher } from './core/EventStitcher'
export { runPipeline } from './core/pipeline'
export type { PipelineOptions, PipelineResult } from './core/pipeline'
export { loadJsonRecords, loadJsonRecordsSync } from './ingest'

// ─── Detectors ───────────────────────────────────────────────────────────────
export { BaseDetector } from './detectors/BaseDetector'
export { StreakDetector } from './detectors/StreakDetector'
export { ChecklistDetector } from './detectors/ChecklistDetector'
export { ActivityPatternAnalyzer } from './detectors/ActivityPatternAnalyzer'
export { RecommendationDetector } from './detectors/RecommendationDetector'
export { GroqFallbackDetector } from './detectors/GroqFallbackDetector'
export { DetectorManager } from './detectors/DetectorManager'
export { createDetector } from './detectors/createDetector'
export { countPatterns, getTopPattern, filterByPattern } from './detectors/EventCounter'

// ─── Filters ─────────────────────────────────────────────────────────────────
export { BaseDetectorFilter } from './detectors-filter/BaseDetectorFilter'
export { ContextBasedFilter } from './detectors-filter/ContextBasedFilter'

// ─── Notifications ───────────────────────────────────────────────────────────
export { generateNotifications } from './notifications'
export type { NotificationOptions, Notification } from './notifications'

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  Event,
  EventGroup,
  EventGroupMap,
  Finding,
  FindingData,
  Severity,
  Detector,
  DetectorConfig,
  DetectorFilter,
  DetectorManagerConfig,
  ChecklistConfig,
  StreakConfig,
  StreakTrigger,
  ActivityPatternAnalyzerConfig,
  LLMDetectorConfig,
  ExpectedItem,
  BuiltinDetectorType
} from './types'
