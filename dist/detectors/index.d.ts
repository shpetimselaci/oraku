import type { Detector } from '../types';
export { BaseDetector } from './BaseDetector';
export { ChecklistDetector } from './ChecklistDetector';
export { StreakDetector } from './StreakDetector';
export { AutoAnalyzer } from './AutoAnalyzer';
export { AutoDetector } from './AutoDetector';
export { DetectorManager } from './DetectorManager';
export { RecommendationDetector } from './RecommendationDetector';
export { detect } from './detect';
export { createDetector } from './createDetector';
export * from './EventCounter';
declare const detectors: Detector[];
export default detectors;
//# sourceMappingURL=index.d.ts.map