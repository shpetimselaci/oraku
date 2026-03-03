const StreakDetector = require('./StreakDetector')
const ChecklistDetector = require('./ChecklistDetector')
const fs = require('fs')
const path = require('path')

const detectors = []

const CACHE_PATH = path.resolve('output', 'api_cache.json')
let apiCache = {}
try { apiCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8') || '{}') } catch {}

function persistCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(apiCache, null, 2))
  } catch {}
}

function buildApiCompareFn(apiConfig) {
  const { url, transform, match, maxItems = 5, timeout = 3000, cacheKey } = apiConfig

  return async (items, expectedItems) => {
    const covered = new Set()
    const uniqueItems = [...new Set(items)].slice(0, maxItems)

    const results = await Promise.all(uniqueItems.map(async item => {
      const key = cacheKey ? cacheKey(item) : item
      if (apiCache[key]) return apiCache[key]
      if (process.env.FAST_MODE) return null

      try {
        const abortController = new AbortController()
        setTimeout(() => abortController.abort(), timeout)
        const response = await fetch(url(item), { signal: abortController.signal })
        if (!response.ok) return null
        const data = await response.json()
        const result = transform ? transform(data) : data
        if (result) { apiCache[key] = result; persistCache() }
        return result
      } catch { return null }
    }))

    results.filter(Boolean).forEach(result => {
      expectedItems.forEach(expected => {
        if (match(result, expected)) covered.add(expected.key)
      })
    })

    return { 
      covered, 
      missing: expectedItems.map(item => item.key).filter(key => !covered.has(key)) 
    }
  }
}

function createChecklistDetector(name, config) {
  const expectedItems = (config.expected || []).map(item =>
    typeof item === 'string' ? { key: item } : item
  )

  const compareFn = config.compare || (config.api ? buildApiCompareFn(config.api) : undefined)

  return new ChecklistDetector({
    name,
    dataSource: config.dataSource,
    severity: config.severity || 'info',
    expectedItems,
    extractActual: config.extract || (entry => entry.items || []),
    compareFn,
    matchFn: config.match,
    todayOnly: config.todayOnly !== false,
    dateFilter: config.dateFilter,
    aggregate: config.aggregate || false,
    message: config.message || (missing => `Missing: ${missing.join(', ')}`)
  })
}

function createStreakDetector(name, type, config) {
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

function createDetector(name, type, config = {}) {
  let detector

  if (type === 'checklist') {
    detector = createChecklistDetector(name, config)
  } else if (type === 'streak-ongoing' || type === 'streak-break') {
    detector = createStreakDetector(name, type, config)
  } else {
    throw new Error(`Unknown detector type: ${type}`)
  }

  detectors.push(detector)
  return detector
}

createDetector.getAll = () => detectors
createDetector.clear = () => detectors.length = 0

module.exports = createDetector
