import { BaseDetector } from './BaseDetector'
import { extractItems, matchItems } from './helpers/itemMatching'
import type {
  Event,
  EventGroup,
  Finding,
  ExpectedItem,
  ChecklistConfig
} from '../types'

export class ChecklistDetector extends BaseDetector {
  expectedItems: ExpectedItem[]
  extractItems: (event: Event) => string | string[]
  itemMatcher: ((actual: string, expected: ExpectedItem) => boolean) | null
  itemComparer: ((
    items: string[],
    expected: ExpectedItem[],
    results: unknown[]
  ) => Promise<{ covered: Set<string>; missing: string[] }>) | null
  messageFormatter: string | ((missing: string[]) => string)
  todayOnly: boolean
  dateFilter: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  aggregate: boolean
  private pendingItems: string[]

  constructor(config: ChecklistConfig) {
    super(config)
    this.expectedItems = config.expectedItems || []
    this.extractItems = config.extractActual || ((event: Event) => this.getString(event, 'name')?.toLowerCase() ?? '')
    this.itemMatcher = config.matchFn || null
    this.itemComparer = config.compareFn || null
    this.messageFormatter = config.message || ((missing: string[]) => `Missing: ${missing.join(', ')}`)
    this.todayOnly = config.todayOnly !== false
    this.dateFilter = config.dateFilter || null
    this.aggregate = config.aggregate || false
    this.pendingItems = []
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (!events.length) return []

    if (this.todayOnly) {
      events = this.filterByDate(events, new Date(), 'day')
    } else if (this.dateFilter) {
      events = this.filterByDateOffset(events, this.dateFilter)
    }

    if (!events.length) return []

    const actualItems = extractItems(events, this.extractItems)

    if (!actualItems.length) return []

    if (this.aggregate) {
      this.pendingItems.push(...actualItems)
      return []
    }

    return this.buildFindings(actualItems, entry)
  }

  async finalize(): Promise<Finding[]> {
    if (!this.aggregate || !this.pendingItems.length) return []
    const items = this.pendingItems.splice(0)
    return this.buildFindings(items, null)
  }

  private async buildFindings(
    actualItems: string[],
    entry: EventGroup | null
  ): Promise<Finding[]> {
    let covered = new Set<string>()
    let missing: string[] = []

    if (this.itemComparer) {
      const result = await this.itemComparer(actualItems, this.expectedItems, [])
      covered = result.covered || new Set()
      missing = result.missing || []
    } else {
      const result = matchItems(actualItems, this.expectedItems, this.itemMatcher ?? undefined)
      covered = result.covered
      missing = result.missing
    }

    if (!missing.length) return []

    const identifier = entry?.externalRef || (this.aggregate ? 'weekly' : 'check')
    const dateStr = this.todayString()

    return [
      this.createFinding({
        id: `${this.name.toLowerCase()}-${identifier}-${dateStr}`,
        notificationType: 'warning',
        message: typeof this.messageFormatter === 'function'
          ? this.messageFormatter(missing)
          : this.messageFormatter,
        evidence: {
          checked: [...new Set(actualItems)],
          covered: Array.from(covered),
          missing
        }
      })
    ]
  }

  private filterByDateOffset(
    events: Event[],
    filter: { unit: 'day' | 'week' | 'month' | 'year'; value: number }
  ): Event[] {
    const now = new Date()
    let target: Date

    switch (filter.unit) {
      case 'day':
        target = new Date(now)
        target.setDate(target.getDate() + filter.value)
        break
      case 'week':
        target = new Date(now)
        target.setDate(target.getDate() + filter.value * 7)
        break
      case 'month':
        target = new Date(now)
        target.setMonth(target.getMonth() + filter.value)
        break
      case 'year':
        target = new Date(now)
        target.setFullYear(target.getFullYear() + filter.value)
        break
      default:
        target = now
    }

    const targetStr = target.toISOString().slice(0, 10)

    if (filter.unit === 'week') {
      const weekStart = new Date(target)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const start = weekStart.toISOString().slice(0, 10)
      const end = weekEnd.toISOString().slice(0, 10)
      return events.filter((ev) => {
        const d = this.parseDate(ev.createdAt)
        if (!d) return false
        const day = d.toISOString().slice(0, 10)
        return day >= start && day <= end
      })
    }

    return events.filter((ev) => {
      const d = this.parseDate(ev.createdAt)
      if (!d) return false
      const eventDate = d.toISOString()
      switch (filter.unit) {
        case 'day': return eventDate.slice(0, 10) === targetStr
        case 'month': return eventDate.slice(0, 7) === targetStr.slice(0, 7)
        case 'year': return eventDate.slice(0, 4) === targetStr.slice(0, 4)
        default: return false
      }
    })
  }
}

export default ChecklistDetector
