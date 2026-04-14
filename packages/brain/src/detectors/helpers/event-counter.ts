import countBy from 'lodash/countBy'
import maxBy from 'lodash/maxBy'
import type { Event, PatternCounts, TopPattern } from '../../types'

export type { PatternCounts, TopPattern }

export function countPatterns(events: Event[]): PatternCounts {
  return countBy(events, e => {
    const cat = typeof e?.category === 'string' ? e.category : ''
    const sub = typeof e?.subcategory === 'string' ? e.subcategory : ''
    return `${cat}\x00${sub}`
  })
}

export function getTopPattern(counts: PatternCounts): TopPattern {
  const entries = Object.entries(counts).map(([key, count]) => ({ key, count }))
  return maxBy(entries, 'count') ?? { key: null, count: 0 }
}

export function filterByPattern(events: Event[], patternKey: string): Event[] {
  const [cat, sub] = patternKey.split('\x00')
  return events.filter((event) => {
    const eventCategory = typeof event?.category === 'string' ? event.category : ''
    const eventSubcategory = typeof event?.subcategory === 'string' ? event.subcategory : ''
    return eventCategory === cat && eventSubcategory === sub
  })
}

export default { countPatterns, getTopPattern, filterByPattern }
