import { BaseDetector } from './BaseDetector'
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
    this.extractItems = config.extractActual || ((e: Event) => e.name?.toLowerCase() || '')
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

    const actualItems = events
      .flatMap((e: Event) => {
        const extracted = this.extractItems(e)
        return Array.isArray(extracted) ? extracted : [extracted]
      })
      .filter(Boolean)

    if (!actualItems.length) return []

    if (this.aggregate) {
      this.pendingItems.push(...actualItems)
      return []
    }

    return this.buildFindings(actualItems, entry)
  }

  async finalize(): Promise<Finding[]> {
    if (!this.aggregate || !this.pendingItems.length) return []
    const findings = await this.buildFindings(this.pendingItems, null)
    this.pendingItems = []
    return findings
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
      const normalizedActual = actualItems.map((a) =>
        typeof a === 'string' ? a.toLowerCase() : a
      )

      for (const expected of this.expectedItems) {
        const isMatched = this.itemMatcher && typeof this.itemMatcher === 'function'
          ? normalizedActual.some((actual) =>
              this.itemMatcher ? this.itemMatcher(actual as string, expected) : false
            )
          : normalizedActual.some((actual) =>
              expected.keywords?.some((k) => (actual as string).includes(k)) ||
              (actual as string).includes(expected.key?.toLowerCase())
            )
        if (isMatched) covered.add(expected.key)
      }

      missing = this.expectedItems
        .map((e) => e.key)
        .filter((key) => !covered.has(key))
    }

    if (!missing.length) return []

    const identifier = entry?.externalRef || (this.aggregate ? 'weekly' : 'check')
    const dateStr = new Date().toISOString().slice(0, 10)

    return [
      this.createFinding({
        id: `${this.name.toLowerCase()}-${identifier}-${dateStr}`,
        severity: this.severity,
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

    return events.filter((ev) => {
      const dateStr = ev.createdAt || ev.date
      if (!dateStr) return false
      switch (filter.unit) {
        case 'day': return dateStr.slice(0, 10) === targetStr
        case 'month': return dateStr.slice(0, 7) === targetStr.slice(0, 7)
        case 'year': return dateStr.slice(0, 4) === targetStr.slice(0, 4)
        default: return false
      }
    })
  }
}

export default ChecklistDetector
