// Re-export all detectors and types
export { BaseDetector } from './BaseDetector'
export { ChecklistDetector } from './ChecklistDetector'
export { MilestoneDetector } from './MilestoneDetector'
export { StreakDetector } from './StreakDetector'
export { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
export { LLMDetector } from './LLMDetector'
export { DetectorManager } from './DetectorManager'
// RecommendationGenerator is a post-processing stage (runs after all detectors, reads findings)
export { RecommendationGenerator } from './RecommendationGenerator'
export { ThresholdDetector } from './ThresholdDetector'
export { ItemAnalysisDetector } from './ItemAnalysisDetector'
export { DetectorBuilder } from './DetectorBuilder'
export * from './helpers/EventCounter'
