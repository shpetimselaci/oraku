import { StreakDetector } from './StreakDetector'
import { ChecklistDetector } from './ChecklistDetector'
import * as fs from 'fs'
import * as path from 'path'
import type {
  Detector,
  BuiltinDetectorType,
  ExpectedItem,
  Event,
  Severity
} from '../types'

interface ApiMatcherConfig {
  url: (item: string) => string
  transform?: (data: unknown) => unknown
  match: (result: unknown, expected: ExpectedItem) => boolean
  maxItems?: number
  timeout?: number
  cacheKey?: (item: string) => string
  cachePath?: string
}

interface ChecklistDetectorConfig {
  dataSource?: string
  severity?: Severity
  expected?: (string | ExpectedItem)[]
  extract?: (entry: Event) => string | string[]
  compare?: (
    items: string[],
    expectedItems: ExpectedItem[],
    results: unknown[]
  ) => Promise<{ covered: Set<string>; missing: string[] }>
  match?: (actual: string, expected: ExpectedItem) => boolean
  api?: ApiMatcherConfig
  todayOnly?: boolean
  dateFilter?: { unit: 'day' | 'month' | 'year'; value: number } | null
  aggregate?: boolean
  message?: string | ((missing: string[]) => string)
}

interface StreakDetectorConfig {
  dataSource?: string
  severity?: Severity
  minRepeat?: number
  message?: (pattern: string) => string
}

type DetectorOptions = ChecklistDetectorConfig | StreakDetectorConfig

const detectors: Detector[] = []

function buildApiItemMatcher(apiConfig: ApiMatcherConfig) {
  const {
    url,
    transform,
    match,
    maxItems = 5,
    timeout = 3000,
    cacheKey,
    cachePath = path.resolve(process.cwd(), 'output', 'api_cache.json')
  } = apiConfig

  let cache: Record<string, unknown> = {}
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8') || '{}')
  } catch {
    // cache file doesn't exist yet, start empty
  }

  function saveCacheToDisk(): void {
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true })
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
    } catch {
      // ignore persist errors
    }
  }

  return async (
    items: string[],
    expectedItems: ExpectedItem[]
  ): Promise<{ covered: Set<string>; missing: string[] }> => {
    const covered = new Set<string>()
    const uniqueItems = [...new Set(items)].slice(0, maxItems)

    const results = await Promise.all(
      uniqueItems.map(async (item) => {
        const key = cacheKey ? cacheKey(item) : item
        if (cache[key]) return cache[key]
        if (process.env.FAST_MODE) return null

        try {
          const abortController = new AbortController()
          setTimeout(() => abortController.abort(), timeout)
          const response = await fetch(url(item), { signal: abortController.signal })
          if (!response.ok) return null
          const data = await response.json()
          const result = transform ? transform(data) : data
          if (result) { cache[key] = result; saveCacheToDisk() }
          return result
        } catch {
          return null
        }
      })
    )

    results.filter(Boolean).forEach((result) => {
      expectedItems.forEach((expected) => {
        if (match(result, expected)) covered.add(expected.key)
      })
    })

    return {
      covered,
      missing: expectedItems.map((item) => item.key).filter((key) => !covered.has(key))
    }
  }
}

function createChecklistDetector(name: string, config: ChecklistDetectorConfig): ChecklistDetector {
  const expectedItems: ExpectedItem[] = (config.expected || []).map((item) =>
    typeof item === 'string' ? { key: item } : item
  )

  const compareFn =
    config.compare || (config.api ? buildApiItemMatcher(config.api) : undefined)

  return new ChecklistDetector({
    name,
    dataSource: config.dataSource,
    severity: config.severity || 'info',
    expectedItems,
    extractActual: config.extract || ((entry: Event) => entry.items || []),
    compareFn,
    matchFn: config.match,
    todayOnly: config.todayOnly !== false,
    dateFilter: config.dateFilter,
    aggregate: config.aggregate || false,
    message: config.message || ((missing: string[]) => `Missing: ${missing.join(', ')}`)
  })
}

function createStreakDetector(
  name: string,
  type: 'streak-ongoing' | 'streak-break',
  config: StreakDetectorConfig
): StreakDetector {
  const isBreakType = type === 'streak-break'
  return new StreakDetector({
    name,
    dataSource: config.dataSource,
    minRepeat: config.minRepeat || 3,
    triggerOn: isBreakType ? 'break' : 'ongoing',
    severity: config.severity || (isBreakType ? 'warning' : 'info'),
    message: config.message
  })
}

function createDetector(name: string, type: BuiltinDetectorType, config: DetectorOptions = {}): Detector {
  let detector: Detector

  if (type === 'checklist') {
    detector = createChecklistDetector(name, config as ChecklistDetectorConfig)
  } else if (type === 'streak-ongoing' || type === 'streak-break') {
    detector = createStreakDetector(name, type, config as StreakDetectorConfig)
  } else {
    throw new Error(`Unknown detector type: ${type}`)
  }

  detectors.push(detector)
  return detector
}

createDetector.getAll = (): Detector[] => detectors
createDetector.clear = (): void => { detectors.length = 0 }

export default createDetector
export { createDetector }
