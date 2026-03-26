import type { Event, ExpectedItem } from '../../types'

// resolves a dot-notation path into an object e.g. 'meta.userId' → obj.meta.userId
export function resolvePath(obj: unknown, dotPath: string): unknown {
  return dotPath.split('.').reduce((curr, key) => {
    if (curr == null) return undefined
    return (curr as Record<string, unknown>)[key]
  }, obj)
}

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
          (expected.key ? actual.includes(expected.key.toLowerCase()) : false)
        )
    if (matched) covered.add(expected.key)
  }

  const missing = expectedItems.map(e => e.key).filter(key => !covered.has(key))
  return { covered, missing }
}
