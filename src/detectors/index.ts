import { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
import { RecommendationGenerator } from './RecommendationGenerator'
import { GroqFallbackDetector } from './GroqFallbackDetector'
import type { Detector } from '../types'

// Re-export all detectors and types
export { BaseDetector } from './BaseDetector'
export { ChecklistDetector } from './ChecklistDetector'
export { MilestoneDetector } from './MilestoneDetector'
export { StreakDetector } from './StreakDetector'
export { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
export { GroqFallbackDetector } from './GroqFallbackDetector'
export { DetectorManager } from './DetectorManager'
// RecommendationGenerator is a post-processing stage (runs after all detectors, reads findings)
// It is not included in the default detectors array
export { RecommendationGenerator } from './RecommendationGenerator'
export { ThresholdDetector } from './ThresholdDetector'
export { ItemAnalysisDetector } from './ItemAnalysisDetector'
export { createDetector } from './helpers/detectorFactory'
export { DetectorBuilder } from './DetectorBuilder'
export * from './helpers/EventCounter'

// ActivityPatternAnalyzer runs first (fast, rule-based)
// RecommendationGenerator aggregates across all users and fires in finalize()
// GroqFallbackDetector (LLM) is fallback - only runs if analyzer finds nothing
const detectors: Detector[] = [new ActivityPatternAnalyzer(), new RecommendationGenerator(), new GroqFallbackDetector()]

export default detectors
