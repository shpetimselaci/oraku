import { BaseDetector } from './BaseDetector'
import { resolvePath } from './helpers/itemMatching'
import { fetchWithTimeout } from './helpers/apiMatcher'
import type { EventGroup, Finding, Event, StaticLookupSource, ApiLookupSource, LookupSource, ItemAnalysisConfig } from '../types'

export type { StaticLookupSource, ApiLookupSource, LookupSource, ItemAnalysisConfig }

export class ItemAnalysisDetector extends BaseDetector {
  private extractFn: (event: Event) => string[]
  private lookup: LookupSource
  private targets: Record<string, number>
  private aggregateMode: 'sum' | 'avg'
  private todayOnly: boolean
  private dateFilter: { unit: 'day' | 'week' | 'month' | 'year'; value: number } | null
  private messageFormatter: (gaps: string[], totals: Record<string, number>, targets: Record<string, number>) => string

  constructor(config: ItemAnalysisConfig) {
    super(config)
    if (typeof config.extract !== 'function' && !config.extract?.path) throw new Error(`ItemAnalysisDetector "${config.name}" requires extract.path`)
    if (!config.lookup) throw new Error(`ItemAnalysisDetector "${config.name}" requires lookup`)
    if (!config.targets) throw new Error(`ItemAnalysisDetector "${config.name}" requires targets`)
    this.lookup = config.lookup
    this.targets = config.targets
    this.aggregateMode = config.aggregate ?? 'sum'
    this.todayOnly = config.todayOnly ?? false
    this.dateFilter = config.dateFilter ?? null

    this.messageFormatter = config.message ?? ((gaps, totals, tgts) => {
      const detail = gaps.map(g => `${g}: ${totals[g]?.toFixed(1) ?? 0} of ${tgts[g]} needed`).join(', ')
      return `Nutritional targets not yet met: ${detail}`
    })

    if (typeof config.extract === 'function') {
      const fn = config.extract
      this.extractFn = (event: Event) => {
        const result = fn(event)
        return Array.isArray(result) ? result : result ? [result] : []
      }
    } else {
      const path = config.extract.path
      this.extractFn = (event: Event) => {
        const val = resolvePath(event, path)
        if (Array.isArray(val)) return val.map(String)
        if (val != null) return [String(val)]
        return []
      }
    }
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (!events.length) return []

    if (this.todayOnly) {
      events = this.filterByDate(events, new Date(), 'day')
    } else if (this.dateFilter) {
      if (!this.isEndOfPeriod(this.dateFilter.unit)) return []
      events = this.filterByDateWindow(events, this.dateFilter)  // inherited from BaseDetector
    }

    if (!events.length) return []

    // collect all item names from all events in this group
    const allItems = events.flatMap(e => this.extractFn(e)).filter(Boolean)
    if (!allItems.length) return []

    // look up each unique item (deduplicated to avoid redundant API calls)
    const uniqueItems = [...new Set(allItems.map(i => i.toLowerCase().trim()))]
    const itemProperties = await this.lookupAll(uniqueItems)

    // aggregate property values — counts multiplicity (apple appearing 3x sums 3x)
    const totals: Record<string, number> = {}
    const itemCounts: Record<string, number> = {}

    for (const rawItem of allItems) {
      const key = rawItem.toLowerCase().trim()
      const props = itemProperties[key]
      if (!props) continue

      for (const [prop, value] of Object.entries(props)) {
        totals[prop] = (totals[prop] ?? 0) + value
        itemCounts[prop] = (itemCounts[prop] ?? 0) + 1
      }
    }

    if (this.aggregateMode === 'avg') {
      for (const prop of Object.keys(totals)) {
        if (itemCounts[prop]) totals[prop] /= itemCounts[prop]
      }
    }

    // find gaps — properties that didn't reach their target
    const gaps = Object.entries(this.targets)
      .filter(([prop, target]) => (totals[prop] ?? 0) < target)
      .map(([prop]) => prop)

    if (!gaps.length) return []

    const dateStr = this.todayString()
    return [
      this.createFinding({
        id: `item-analysis-${this.name.toLowerCase()}-${entry.externalRef ?? 'auto'}-${dateStr}`,
        message: this.messageFormatter(gaps, totals, this.targets),
        evidence: {
          itemsAnalyzed: uniqueItems,
          totals,
          targets: this.targets,
          gaps
        }
      })
    ]
  }

  private async lookupAll(items: string[]): Promise<Record<string, Record<string, number>>> {
    const entries = await Promise.all(
      items.map(async item => {
        try {
          return [item, await this.lookupOne(item)] as const
        } catch (err) {
          console.warn(`[ItemAnalysisDetector] lookup failed for "${item}":`, (err as Error).message)
          return [item, {}] as const
        }
      })
    )
    return Object.fromEntries(entries)
  }

  private async lookupOne(item: string): Promise<Record<string, number>> {
    // static map takes priority
    if (this.lookup.map) {
      const entry = this.lookup.map[item] ?? this.lookup.map[item.toLowerCase()] ?? {}
      return entry
    }

    if (this.lookup.api) {
      const { urlTemplate, responsePath, mapResponse, timeout } = this.lookup.api
      const url = urlTemplate.replace('{item}', encodeURIComponent(item))
      const data = await fetchWithTimeout(url, timeout)

      if (mapResponse) return mapResponse(data, item)

      const resolved = responsePath ? resolvePath(data, responsePath) : data
      if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
        // convert any numeric values in the response object to a flat properties map
        const props: Record<string, number> = {}
        for (const [key, val] of Object.entries(resolved as Record<string, unknown>)) {
          const num = Number(val)
          if (!Number.isNaN(num)) props[key] = num
        }
        return props
      }
    }

    return {}
  }
}

export default ItemAnalysisDetector
