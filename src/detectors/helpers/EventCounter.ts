import type { Event, PatternCounts, TopPattern } from '../../types'

export type { PatternCounts, TopPattern }

export function countPatterns(events: Event[]): PatternCounts {
  const counts: PatternCounts = {}
  for (const e of events) {
    const eventCategory = typeof e?.category === 'string' ? e.category : ''
    const eventSubcategory = typeof e?.subcategory === 'string' ? e.subcategory : ''
    const key = `${eventCategory}|${eventSubcategory}`
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
  return events.filter((event) => {
    const eventCategory = typeof event?.category === 'string' ? event.category : ''
    const eventSubcategory = typeof event?.subcategory === 'string' ? event.subcategory : ''
    return eventCategory === cat && eventSubcategory === sub
  })
}

export default { countPatterns, getTopPattern, filterByPattern }
