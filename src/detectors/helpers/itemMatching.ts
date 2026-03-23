import type { Event, ExpectedItem } from '../../types'

// pulls item strings out of a list of events using the provided extractor
export function extractItems(
  events: Event[],
  extractFn: (event: Event) => string | string[]
): string[] {
  return events
    .flatMap(e => {
      const extracted = extractFn(e)
      return Array.isArray(extracted) ? extracted : [extracted]
    })
    .filter(Boolean)
}

// compares actual items against expected items, returns which were covered and which are missing
export function matchItems(
  actualItems: string[],
  expectedItems: ExpectedItem[],
  matchFn?: (actual: string, expected: ExpectedItem) => boolean
): { covered: Set<string>; missing: string[] } {
  const normalized = actualItems.map(a => a.toLowerCase())
  const covered = new Set<string>()

  for (const expected of expectedItems) {
    const matched = matchFn
      ? normalized.some(actual => matchFn(actual, expected))
      : normalized.some(actual =>
          expected.keywords?.some(k => actual.includes(k)) ||
          actual.includes(expected.key?.toLowerCase())
        )
    if (matched) covered.add(expected.key)
  }

  const missing = expectedItems.map(e => e.key).filter(key => !covered.has(key))
  return { covered, missing }
}
