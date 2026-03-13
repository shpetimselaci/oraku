import { StreakDetector } from './StreakDetector'
import { ChecklistDetector } from './ChecklistDetector'
import { buildApiItemMatcher } from './apiMatcher'
import { buildFromSerializable } from './buildFromSerializable'
import type { Detector, BuiltinDetectorType, ExpectedItem, Event, Severity, SerializableDetectorConfig } from '../types'

interface ChecklistDetectorConfig {
  dataSource?: string
  severity?: Severity
  expected?: (string | ExpectedItem)[]
  extract?: (entry: Event) => string | string[]
  compare?: (items: string[], expectedItems: ExpectedItem[], results: unknown[]) => Promise<{ covered: Set<string>; missing: string[] }>
  match?: (actual: string, expected: ExpectedItem) => boolean
  api?: Parameters<typeof buildApiItemMatcher>[0]
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'month' | 'year'; value: number } | null
  aggregate?: boolean
  message?: string | ((missing: string[]) => string)
}

interface StreakDetectorConfig {
  dataSource?: string
  severity?: Severity
  minRepeat?: number
  message?: (pattern: string) => string
}

type DetectorOptions = ChecklistDetectorConfig | StreakDetectorConfig

const detectors: Detector[] = []

function createChecklistDetector(name: string, config: ChecklistDetectorConfig): ChecklistDetector {
  const expectedItems: ExpectedItem[] = (config.expected || []).map((item) =>
    typeof item === 'string' ? { key: item } : item
  )
  const compareFn = config.compare || (config.api ? buildApiItemMatcher(config.api) : undefined)
  return new ChecklistDetector({
    name,
    dataSource: config.dataSource,
    severity: config.severity || 'info',
    expectedItems,
    extractActual: config.extract || ((entry: Event) => entry.items || []),
    compareFn,
    matchFn: config.match,
    todayOnly: config.todayOnly !== false,
    dateFilter: config.dateFilter,
    aggregate: config.aggregate || false,
    message: config.message || ((missing: string[]) => `Missing: ${missing.join(', ')}`)
  })
}

function createStreakDetector(name: string, type: 'streak-ongoing' | 'streak-break', config: StreakDetectorConfig): StreakDetector {
  const isBreakType = type === 'streak-break'
  return new StreakDetector({
    name,
    dataSource: config.dataSource,
    minRepeat: config.minRepeat || 3,
    triggerOn: isBreakType ? 'break' : 'ongoing',
    severity: config.severity || (isBreakType ? 'warning' : 'info'),
    message: config.message
  })
}

function createDetector(name: string, type: BuiltinDetectorType, config: DetectorOptions = {}): Detector {
  let detector: Detector
  if (type === 'checklist') {
    detector = createChecklistDetector(name, config as ChecklistDetectorConfig)
  } else if (type === 'streak-ongoing' || type === 'streak-break') {
    detector = createStreakDetector(name, type, config as StreakDetectorConfig)
  } else {
    throw new Error(`Unknown detector type: ${type}`)
  }
  detectors.push(detector)
  return detector
}

createDetector.getAll = (): Detector[] => detectors
createDetector.clear = (): void => { detectors.length = 0 }
createDetector.buildFromSerializable = (config: SerializableDetectorConfig): Detector =>
  buildFromSerializable(config, createChecklistDetector, createStreakDetector)

export default createDetector
export { createDetector }
