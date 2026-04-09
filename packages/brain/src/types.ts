// ============ EVENTS ============

export interface Event {
  createdAt: string
  [key: string]: unknown
}

export interface EventGroup {
  externalRef: string
  events: Event[]
  first: string | null
  last: string | null
  count: number
}

export type EventGroupMap = Record<string, EventGroup>

// ============ FINDINGS ============

export type NotificationType = 'reminder' | 'warning' | 'nudge' | 'suggestion' | 'achievement' | 'insight'

export interface Finding {
  id: string
  detector: string
  notificationType: NotificationType
  message: string
  evidence: Record<string, unknown>
  [key: string]: unknown
}

export interface FindingData {
  id?: string
  notificationType?: NotificationType
  message: string
  evidence?: Record<string, unknown>
  [key: string]: unknown
}

// ============ DETECTORS ============

export interface DetectorConfig {
  name?: string
  description?: string
  notificationType?: NotificationType
  scheduleAt?: string  // UTC time to fire the notification, e.g. '16:00' — overrides the default CASE in saveNotifications
}

export interface Detector {
  name: string
  description: string
  notificationType: NotificationType
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

export type StreakPrecision = 'day' | 'time'

export interface StreakConfig extends DetectorConfig {
  minRepeat?: number
  triggerOn?: StreakTrigger
  frequency?: StreakFrequency
  precision?: StreakPrecision
  message?: (pattern: string) => string
}

export interface TimestampedEvent extends Event {
  _date: Date
}

// ============ ACTIVITY PATTERN ANALYZER ============

export interface ActivityPatternAnalyzerConfig extends DetectorConfig {
  minStreakLength?: number
  breakThresholdDays?: number
  dataSources?: string[]  // only analyze events from these categories — if omitted, analyzes nothing
  varietyLookbackDays?: number
  summaryLookbackDays?: number
  maxActivitiesInSummary?: number
}

// ============ AUTO DETECTOR (LLM) ============

export interface RawLLMFinding {
  message: string
  category: string
  evidence: string
}

// ============ DETECTOR MANAGER ============

export interface DetectorManagerConfig {
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

// ============ SDK DETECTOR SCHEMA ============

export interface SDKDetectorSchema {
  name: string
  type: 'checklist' | 'milestone' | 'streak-ongoing' | 'streak-break' | 'threshold' | 'item-analysis'
  marker?: string
  notificationType?: NotificationType
  expected?: string[]
  extract?: { path: string }
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  minRepeat?: number
  precision?: StreakPrecision
  operator?: ThresholdOperator
  value?: number
  aggregate?: ThresholdAggregate
  lookup?: {
    map?: Record<string, Record<string, number>>
    api?: { urlTemplate: string; responsePath?: string; timeout?: number }
  }
  targets?: Record<string, number>
  scheduleAt?: string
}

// ============ THRESHOLD DETECTOR ============

export type ThresholdOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
export type ThresholdAggregate = 'sum' | 'avg' | 'count' | 'min' | 'max'

export interface ThresholdConfig extends DetectorConfig {
  extract: { path: string } | ((event: Event) => number | null)
  operator: ThresholdOperator
  value: number
  aggregate?: ThresholdAggregate
  todayOnly?: boolean
  message?: string | ((actual: number, target: number) => string)
}

// ============ ITEM ANALYSIS DETECTOR ============

export interface StaticLookupSource {
  // item name → property → numeric value
  // e.g. { apple: { protein: 0.3, vitamin_c: 8 }, milk: { protein: 3.4, calcium: 125 } }
  map: Record<string, Record<string, number>>
}

export interface ApiLookupSource {
  // {item} is replaced with the item name before fetching
  urlTemplate: string
  // dot-notation path into the API response to find the properties object
  responsePath?: string
  // custom mapper — use instead of responsePath when the shape is more complex
  mapResponse?: (data: unknown, item: string) => Record<string, number>
  timeout?: number
}

export interface LookupSource {
  map?: StaticLookupSource['map']
  api?: ApiLookupSource
}

export interface ItemAnalysisConfig extends DetectorConfig {
  // how to extract the list of item names from each event
  extract: { path: string } | ((event: Event) => string | string[])
  // where to look up each item's properties
  lookup: LookupSource
  // minimum required value for each property — anything below fires as a gap
  targets: Record<string, number>
  // how to combine property values across items (default: sum)
  aggregate?: 'sum' | 'avg'
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  message?: (gaps: string[], totals: Record<string, number>, targets: Record<string, number>) => string
}

// ============ DETECTOR BUILDER ============

export type MarkerPredicate = (event: Event) => boolean

export interface BuilderEntry {
  detector: Detector
  markers: MarkerPredicate[]
}


// ============ CONTEXT FILTER ============

export interface ExtendedDetector extends Detector {
  minEvents?: number
  requiresRecurring?: boolean
  recurringThreshold?: number
  supportedCategories?: string[]
}

// ============ RECOMMENDATION GENERATOR ============

export interface UserProfile {
  interests: Record<string, number>
  activities: Set<string>
}

export interface ActivityPopularity {
  activity: string
  popularity: number
}

// ============ EVENT COUNTER ============

export type PatternCounts = Record<string, number>

export interface TopPattern {
  key: string | null
  count: number
}

// ============ CLI ============

export interface UserTrace {
  name: string
  actions: Array<{ what: string | undefined; category: string | undefined; when: string }>
}

// ============ GROUP DETECTOR ============

export interface GroupDetector {
  name: string
  detectAll(groups: EventGroupMap, profiles: PersistedUserProfile[]): Promise<Finding[]>
}

// ============ PERSISTED USER PROFILE ============

export interface PersistedUserProfile {
  externalRef: string
  organizationId: string
  organizationName: string
  topCategories: Array<{ category: string; count: number }>
  topSubcategories: Array<{ subcategory: string; count: number }>
  dailyPattern: Record<string, number>
  lastUpdated: string
}

// ============ PIPELINE ============

export interface PipelineOptions {
  builders?: import('./detectors/DetectorBuilder').DetectorBuilder[]
  provider?: LLMProvider
  forUserId?: string
  notificationsPerUser?: number
}

export interface PipelineResult {
  count: number
  findings: Finding[]
  notifications: Notification[]
  notificationsByUser: Record<string, Notification[]>
}

// ============ CRON ============

export interface CronHandle {
  stop: () => void
}

// ============ LLM PROVIDER ============

export interface LLMProvider {
  complete(userContent: string, systemPrompt?: string): Promise<string>
}

export interface ChatProviderConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  timeout?: number
}

export interface LLMDetectorConfig extends DetectorConfig {
  ai: import('./ai').AI
  maxEvents?: number
}

// ============ NOTIFICATIONS ============

export interface Notification {
  ref: string
  detector: string
  type: string
  message: string
  scheduledAt?: string
  permanent?: boolean
}

export interface NotificationOptions {
  provider: LLMProvider
  subjectMap?: Record<string, string>
}

// ============ API MATCHER ============

export interface ApiMatcherConfig {
  url: (item: string) => string
  transform?: (data: unknown) => unknown
  match: (result: unknown, expected: ExpectedItem) => boolean
  maxItems?: number
  timeout?: number
  cacheKey?: (item: string) => string
  cachePath?: string
}

// ============ DB ============

export interface DbFinding {
  id: string
  user_id: string
  detector: string
  notification_type: NotificationType
  message: string
  evidence: Record<string, unknown>
  detected_at: string
}

export interface DbNotification {
  id: string
  user_id: string
  external_ref?: string
  detector?: string
  message: string
  type: string
  scheduled_at: string
  generated_date: string
  created_at: string
  delivered_at: string | null
}
