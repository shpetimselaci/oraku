// Re-export all detectors and types
export { BaseDetector } from './base-detector'
export { ChecklistDetector } from './checklist-detector'
export { MilestoneDetector } from './milestone-detector'
export { StreakDetector } from './streak-detector'
export { ActivityPatternAnalyzer } from './activity-pattern-analyzer'
export { LLMDetector } from './llm-detector'
export { DetectorManager } from './detector-manager'
// RecommendationGenerator is a post-processing stage (runs after all detectors, reads findings)
export { RecommendationGenerator } from './recommendation-generator'
export { ThresholdDetector } from './threshold-detector'
export { ItemAnalysisDetector } from './item-analysis-detector'
export { DetectorBuilder } from './detector-builder'
export * from './helpers/event-counter'
