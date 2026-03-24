// ============ EVENTS ============

export interface Event {
  externalRef?: string
  category?: string
  subcategory?: string
  name?: string
  log?: string
  action?: string
  items?: string[]
  createdAt?: string
  date?: string
  meta?: Record<string, unknown>
}

export interface EventGroup {
  externalRef: string
  events: Event[]
  first?: string
  last?: string
  count: number
}

export type EventGroupMap = Record<string, EventGroup>

// ============ FINDINGS ============

export type Severity = 'info' | 'warning' | 'success' | 'error'

export interface Finding {
  id: string
  detector: string
  severity: Severity
  message: string
  evidence: Record<string, unknown>
  [key: string]: unknown
}

export interface FindingData {
  id?: string
  severity?: Severity
  message: string
  evidence?: Record<string, unknown>
  [key: string]: unknown
}

// ============ DETECTORS ============

export interface DetectorConfig {
  name?: string
  description?: string
  severity?: Severity
}

export interface Detector {
  name: string
  description: string
  severity: Severity
  isFallback?: boolean
  detect(entry: EventGroup): Promise<Finding[]>
  finalize?(): Promise<Finding[]>
}

// ============ CHECKLIST DETECTOR ============

export interface ExpectedItem {
  key: string
  keywords?: string[]
  match?: RegExp
  api?: string
}

export interface ChecklistConfig extends DetectorConfig {
  expectedItems?: ExpectedItem[]
  extractActual?: (event: Event) => string | string[]
  matchFn?: (actual: string, expected: ExpectedItem) => boolean
  compareFn?: (
    items: string[],
    expected: ExpectedItem[],
    results: unknown[]
  ) => Promise<{ covered: Set<string>; missing: string[] }>
  message?: string | ((missing: string[]) => string)
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  aggregate?: boolean
}

// ============ MILESTONE DETECTOR ============

export interface MilestoneConfig extends DetectorConfig {
  milestones: ExpectedItem[]
  extractActual?: (event: Event) => string | string[]
  matchFn?: (actual: string, expected: ExpectedItem) => boolean
  message?: string | ((achieved: string[]) => string)
  todayOnly?: boolean
}

// ============ STREAK DETECTOR ============

export type StreakTrigger = 'ongoing' | 'break'
export type StreakFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface StreakConfig extends DetectorConfig {
  minRepeat?: number
  triggerOn?: StreakTrigger
  frequency?: StreakFrequency
  message?: (pattern: string) => string
}

// ============ ACTIVITY PATTERN ANALYZER ============

export interface ActivityPatternAnalyzerConfig extends DetectorConfig {
  minStreakLength?: number
  breakThresholdDays?: number
  dataSources?: string[]  // only analyze events from these categories — if omitted, analyzes nothing
}

// ============ AUTO DETECTOR (LLM) ============

export interface LLMDetectorConfig extends DetectorConfig {
  apiKey?: string
  model?: string
  maxEvents?: number
  timeout?: number
}

export interface RawLLMFinding {
  severity: Severity
  message: string
  category: string
  evidence: string
}

// ============ DETECTOR MANAGER ============

export interface DetectorManagerConfig {
  only?: string
  filterMechanism?: DetectorFilter
  context?: Record<string, unknown>
  extraDetectors?: Detector[]
  builders?: import('./detectors/DetectorBuilder').DetectorBuilder[]
}

export interface DetectorFilter {
  filter(
    detectors: Detector[],
    entry: EventGroup,
    context: Record<string, unknown>
  ): Detector[]
}

// ============ THRESHOLD DETECTOR ============

export type ThresholdOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
export type ThresholdAggregate = 'sum' | 'avg' | 'count' | 'min' | 'max'

export interface ThresholdDetectorConfig extends DetectorConfig {
  extract: { path: string } | ((event: Event) => number | null)
  operator: ThresholdOperator
  value: number
  aggregate?: ThresholdAggregate
  todayOnly?: boolean
  message?: string | ((actual: number, target: number) => string)
}

