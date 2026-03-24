import type { Detector, ExpectedItem, Event, SerializableDetectorConfig } from '../../types'
import type { ApiMatcherConfig } from './apiMatcher'
import { resolvePath } from './itemMatching'
import { ThresholdDetector } from '../ThresholdDetector'
import { ItemAnalysisDetector } from '../ItemAnalysisDetector'
import { MilestoneDetector } from '../MilestoneDetector'


export function buildDetectorFromConfig(
  config: SerializableDetectorConfig,
  createChecklistDetector: (name: string, config: object) => Detector,
  createStreakDetector: (name: string, type: 'streak-ongoing' | 'streak-break', config: object) => Detector
): Detector {
  if (config.type === 'checklist') {
    const extract = config.extract?.path
      ? (event: Event): string | string[] => {
          const val = resolvePath(event, config.extract!.path)
          if (Array.isArray(val)) return val.map(String)
          if (val != null) return String(val)
          return []
        }
      : undefined

    const apiConfig: ApiMatcherConfig | undefined = config.api
      ? {
          url: (item: string) =>
            config.api!.urlTemplate.replace('{item}', encodeURIComponent(item)),
          transform: config.api.responsePath
            ? (data: unknown) => resolvePath(data, config.api!.responsePath!)
            : undefined,
          match: (result: unknown, expected: ExpectedItem) => {
            if (!config.api?.matchKey) {
              return String(result).toLowerCase().includes(expected.key.toLowerCase())
            }
            const val = resolvePath(result, config.api.matchKey)
            const values = Array.isArray(val) ? val : [val]
            return values.some(v => String(v).toLowerCase().includes(expected.key.toLowerCase()))
          },
          timeout: config.api.timeout
        }
      : undefined

    return createChecklistDetector(config.name, {
      dataSource: config.dataSource,
      severity: config.severity,
      expected: config.expected ?? [],
      extract,
      api: apiConfig,
      todayOnly: config.todayOnly,
      message: config.message
    })
  }

  if (config.type === 'milestone') {
    return new MilestoneDetector({
      name: config.name,
      dataSource: config.dataSource,
      severity: config.severity,
      milestones: (config.expected ?? []).map(key => ({ key })),
      todayOnly: config.todayOnly,
      message: config.message
    })
  }

  if (config.type === 'streak-ongoing' || config.type === 'streak-break') {
    return createStreakDetector(config.name, config.type, {
      dataSource: config.dataSource,
      severity: config.severity,
      minRepeat: config.minRepeat
    })
  }

  if (config.type === 'threshold') {
    if (!config.extract?.path) throw new Error(`ThresholdDetector "${config.name}" requires extract.path`)
    if (config.operator === undefined) throw new Error(`ThresholdDetector "${config.name}" requires operator`)
    if (config.value === undefined) throw new Error(`ThresholdDetector "${config.name}" requires value`)

    return new ThresholdDetector({
      name: config.name,
      dataSource: config.dataSource,
      severity: config.severity,
      extract: { path: config.extract.path },
      operator: config.operator,
      value: config.value,
      aggregate: config.aggregate,
      todayOnly: config.todayOnly,
      message: config.message
    })
  }

  if (config.type === 'item-analysis') {
    if (!config.extract?.path) throw new Error(`ItemAnalysisDetector "${config.name}" requires extract.path`)
    if (!config.lookup) throw new Error(`ItemAnalysisDetector "${config.name}" requires lookup`)
    if (!config.targets) throw new Error(`ItemAnalysisDetector "${config.name}" requires targets`)

    return new ItemAnalysisDetector({
      name: config.name,
      dataSource: config.dataSource,
      severity: config.severity,
      extract: { path: config.extract.path },
      lookup: config.lookup,
      targets: config.targets,
      aggregate: config.aggregate as 'sum' | 'avg' | undefined,
      todayOnly: config.todayOnly,
      message: config.message ? () => config.message! : undefined
    })
  }

  throw new Error(`Unknown detector type: ${config.type}`)
}
