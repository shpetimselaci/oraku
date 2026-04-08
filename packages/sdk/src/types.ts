export interface ActivityEvent {
  externalRef?: string
  category?: string
  subcategory?: string
  log?: string
  createdAt?: string
  meta?: Record<string, unknown>
}

export interface GenerateOptions {
  externalRef?: string
  limit?: number
}

export interface ProjectSettings {
  webhookUrl?: string
  webhookAuthKey?: string
  notificationsPerUser?: number
}

export interface ProjectCron {
  cron: string
}

export interface OrakuConfig {
  apiUrl: string
  apiKey: string
  notificationsPerUser?: number
}

export interface DetectorExtractConfig {
  path: string
}

export interface DetectorApiConfig {
  urlTemplate: string
  responsePath?: string
  matchKey?: string
  timeout?: number
}

export type NotificationType = 'reminder' | 'warning' | 'nudge' | 'suggestion' | 'achievement' | 'insight'

export interface Notification {
  ref: string
  detector: string
  type: string
  message: string
}

export interface SDKDetectorSchema {
  name: string
  type: 'checklist' | 'milestone' | 'streak-ongoing' | 'streak-break' | 'threshold' | 'item-analysis'
  marker?: string
  notificationType?: NotificationType
  scheduleAt?: string
  // checklist / milestone fields
  expected?: string[]
  extract?: DetectorExtractConfig
  api?: DetectorApiConfig
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  // streak fields
  minRepeat?: number
  message?: string
  // threshold fields
  operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
  value?: number
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  // item-analysis fields
  lookup?: {
    map?: Record<string, Record<string, number>>
    api?: { urlTemplate: string; responsePath?: string; timeout?: number }
  }
  targets?: Record<string, number>
}
