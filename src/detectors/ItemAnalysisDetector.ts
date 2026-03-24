import { BaseDetector } from './BaseDetector'
import { resolvePath } from './helpers/itemMatching'
import { fetchWithTimeout } from './helpers/apiMatcher'
import type { EventGroup, Finding, DetectorConfig, Event } from '../types'

// ---- lookup source types ----

export interface StaticLookupSource {
  // item name → property → numeric value
  // e.g. { apple: { protein: 0.3, vitamin_c: 8 }, milk: { protein: 3.4, calcium: 125 } }
  map: Record<string, Record<string, number>>
}

export interface ApiLookupSource {
  // {item} is replaced with the item name before fetching
  urlTemplate: string
  // dot-notation path into the API response to find the properties object
  // e.g. "nutrients" if response is { nutrients: { protein: 3.4, ... } }
  responsePath?: string
  // custom mapper — use instead of responsePath when the shape is more complex
  mapResponse?: (data: unknown, item: string) => Record<string, number>
  timeout?: number
}

export interface LookupSource {
  map?: StaticLookupSource['map']
  api?: ApiLookupSource
}

// ---- detector config ----

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
  message?: (gaps: string[], totals: Record<string, number>, targets: Record<string, number>) => string
}


// ---- detector ----

export class ItemAnalysisDetector extends BaseDetector {
  private extractFn: (event: Event) => string[]
  private lookup: LookupSource
  private targets: Record<string, number>
  private aggregateMode: 'sum' | 'avg'
  private todayOnly: boolean
  private messageFormatter: (gaps: string[], totals: Record<string, number>, targets: Record<string, number>) => string

  constructor(config: ItemAnalysisConfig) {
    super(config)
    this.lookup = config.lookup
    this.targets = config.targets
    this.aggregateMode = config.aggregate ?? 'sum'
    this.todayOnly = config.todayOnly !== false

    this.messageFormatter = config.message ?? ((gaps, totals, tgts) => {
      const detail = gaps.map(g => `${g} (${totals[g]?.toFixed(1) ?? 0}/${tgts[g]})`).join(', ')
      return `Nutritional gaps today: ${detail}`
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
        severity: this.severity,
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
    const results: Record<string, Record<string, number>> = {}

    for (const item of items) {
      try {
        results[item] = await this.lookupOne(item)
      } catch {
        // if a lookup fails, skip that item rather than crashing the whole detection
      }
    }

    return results
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
