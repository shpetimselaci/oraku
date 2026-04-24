// ─── AI ──────────────────────────────────────────────────────────────────────
export { AI } from './ai-wrapper/ai'

// ─── Core ────────────────────────────────────────────────────────────────────
export { EventStitcher } from './core/event-stitcher'
export { runPipeline } from './core/pipeline'
export { initSchema } from './db/schema'

// ─── Detectors ───────────────────────────────────────────────────────────────
export { BaseDetector } from './detectors/base-detector'
export { StreakDetector } from './detectors/streak-detector'
export { ChecklistDetector } from './detectors/checklist-detector'
export { MilestoneDetector } from './detectors/milestone-detector'
export { ThresholdDetector } from './detectors/threshold-detector'
export { ItemAnalysisDetector } from './detectors/item-analysis-detector'
export { ActivityPatternAnalyzer } from './detectors/activity-pattern-analyzer'
export { RecommendationGenerator } from './detectors/recommendation-generator'
export { LLMDetector } from './detectors/llm-detector'
export { ChatProvider } from './providers/chat-provider'
export { DetectorManager } from './detectors/detector-manager'
export { DetectorBuilder } from './detectors/detector-builder'
export { toBuilder } from './detectors/helpers/to-builder'
export { countPatterns, getTopPattern, filterByPattern } from './detectors/helpers/event-counter'

// ─── Filters ─────────────────────────────────────────────────────────────────
export { BaseDetectorFilter } from './filters/base-detector-filter'
export { ContextBasedFilter } from './filters/context-based-filter'

// ─── Notifications ───────────────────────────────────────────────────────────
export { generateNotifications } from './core/notification-generator'
export { getProjectDetectors, setProjectDetectors, getProjectSettings, setProjectSettings, getAllProjectDetectors, getAllProjectSettings } from './db/project-store'
export type { ProjectSettings } from './db/project-store'

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
  LLMProvider,
  ChatProviderConfig,
  LLMDetectorConfig,
  Notification,
  NotificationOptions,
  ThresholdConfig,
  ApiMatcherConfig,
  DbFinding,
  SDKDetectorSchema
} from './types'
