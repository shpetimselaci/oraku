// ─── Core ────────────────────────────────────────────────────────────────────
export { EventStitcher } from './core/EventStitcher'
export { runPipeline } from './core/pipeline'
export type { PipelineOptions, PipelineResult } from './core/pipeline'
export { schedulePipeline } from './core/cron'
export type { CronHandle } from './core/cron'
export { loadJsonRecords, loadJsonRecordsSync } from './ingest'

// ─── Detectors ───────────────────────────────────────────────────────────────
export { BaseDetector } from './detectors/BaseDetector'
export { StreakDetector } from './detectors/StreakDetector'
export { ChecklistDetector } from './detectors/ChecklistDetector'
export { MilestoneDetector } from './detectors/MilestoneDetector'
export { ThresholdDetector } from './detectors/ThresholdDetector'
export { ItemAnalysisDetector } from './detectors/ItemAnalysisDetector'
export { ActivityPatternAnalyzer } from './detectors/ActivityPatternAnalyzer'
export { RecommendationGenerator } from './detectors/RecommendationGenerator'
export { GroqFallbackDetector } from './detectors/GroqFallbackDetector'
export { DetectorManager } from './detectors/DetectorManager'
export { DetectorBuilder } from './detectors/DetectorBuilder'
export { toBuilder } from './detectors/helpers/toBuilder'
export type { DetectorConfig } from './detectors/helpers/toBuilder'
export { countPatterns, getTopPattern, filterByPattern } from './detectors/helpers/EventCounter'

// ─── Filters ─────────────────────────────────────────────────────────────────
export { BaseDetectorFilter } from './filters/BaseDetectorFilter'
export { ContextBasedFilter } from './filters/ContextBasedFilter'

// ─── Notifications ───────────────────────────────────────────────────────────
export { generateNotifications } from './notificationGenerator'
export type { NotificationOptions, Notification } from './notificationGenerator'

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
  ExpectedItem
} from './types'
