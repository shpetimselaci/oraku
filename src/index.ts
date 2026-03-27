// ─── Core ────────────────────────────────────────────────────────────────────
export { EventStitcher } from './core/EventStitcher'
export { runPipeline } from './core/pipeline'
export { schedulePipeline } from './core/cron'
export { loadEvents, loadEventsSync, stitch, writeGroups } from './ingest'

// ─── Detectors ───────────────────────────────────────────────────────────────
export { BaseDetector } from './detectors/BaseDetector'
export { StreakDetector } from './detectors/StreakDetector'
export { ChecklistDetector } from './detectors/ChecklistDetector'
export { MilestoneDetector } from './detectors/MilestoneDetector'
export { ThresholdDetector } from './detectors/ThresholdDetector'
export { ItemAnalysisDetector } from './detectors/ItemAnalysisDetector'
export { ActivityPatternAnalyzer } from './detectors/ActivityPatternAnalyzer'
export { RecommendationGenerator } from './detectors/RecommendationGenerator'
export { LLMDetector } from './detectors/LLMDetector'
export { ChatProvider } from './providers/ChatProvider'
export { DetectorManager } from './detectors/DetectorManager'
export { DetectorBuilder } from './detectors/DetectorBuilder'
export { toBuilder } from './detectors/helpers/toBuilder'
export { countPatterns, getTopPattern, filterByPattern } from './detectors/helpers/EventCounter'

// ─── Filters ─────────────────────────────────────────────────────────────────
export { BaseDetectorFilter } from './filters/BaseDetectorFilter'
export { ContextBasedFilter } from './filters/ContextBasedFilter'

// ─── Notifications ───────────────────────────────────────────────────────────
export { generateNotifications } from './notificationGenerator'

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  Event,
  EventGroup,
  EventGroupMap,
  Finding,
  FindingData,
  NotificationType,
  DetectorConfig as BaseDetectorConfig,
  DetectorFilter,
  DetectorManagerConfig,
  ChecklistConfig,
  StreakConfig,
  StreakTrigger,
  ActivityPatternAnalyzerConfig,
  ExpectedItem,
  PipelineOptions,
  PipelineResult,
  CronHandle,
  LLMProvider,
  ChatProviderConfig,
  LLMDetectorConfig,
  Notification,
  NotificationOptions,
  ThresholdConfig,
  ApiMatcherConfig,
  DbFinding,
  DbNotification,
  SDKDetectorSchema
} from './types'
