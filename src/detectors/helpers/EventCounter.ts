import type { Event } from '../../types'

export interface PatternCounts {
  [key: string]: number
}

export interface TopPattern {
  key: string | null
  count: number
}

export function countPatterns(events: Event[]): PatternCounts {
  const counts: PatternCounts = {}
  for (const e of events) {
    const key = `${e?.category || ''}|${e?.subcategory || ''}`
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

export function getTopPattern(counts: PatternCounts): TopPattern {
  let top: TopPattern = { key: null, count: 0 }
  for (const [key, count] of Object.entries(counts)) {
    if (count > top.count) top = { key, count }
  }
  return top
}

export function filterByPattern(events: Event[], patternKey: string): Event[] {
  const [cat, sub] = patternKey.split('|')
  return events.filter((e) => e?.category === cat && e?.subcategory === sub)
}

export default { countPatterns, getTopPattern, filterByPattern }
