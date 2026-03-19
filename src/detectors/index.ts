import { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
import { RecommendationDetector } from './RecommendationDetector'
import { GroqFallbackDetector } from './GroqFallbackDetector'
import type { Detector } from '../types'

// Re-export all detectors and types
export { BaseDetector } from './BaseDetector'
export { ChecklistDetector } from './ChecklistDetector'
export { StreakDetector } from './StreakDetector'
export { ActivityPatternAnalyzer } from './ActivityPatternAnalyzer'
export { GroqFallbackDetector } from './GroqFallbackDetector'
export { DetectorManager } from './DetectorManager'
// RecommendationDetector is a post-processing stage (runs after all detectors, reads findings)
// It is not included in the default detectors array
export { RecommendationDetector } from './RecommendationDetector'
export { ThresholdDetector } from './ThresholdDetector'
export { ItemAnalysisDetector } from './ItemAnalysisDetector'
export { createDetector } from './createDetector'
export * from './EventCounter'

// ActivityPatternAnalyzer runs first (fast, rule-based)
// RecommendationDetector aggregates across all users and fires in finalize()
// GroqFallbackDetector (LLM) is fallback - only runs if analyzer finds nothing
const detectors: Detector[] = [new ActivityPatternAnalyzer(), new RecommendationDetector(), new GroqFallbackDetector()]

export default detectors
