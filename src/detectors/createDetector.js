const StreakDetector = require('./StreakDetector')
const ChecklistDetector = require('./ChecklistDetector')
const fs = require('fs')
const path = require('path')

const registry = []

// API cache (shared across all detectors)
const CACHE_PATH = path.resolve('output', 'api_cache.json')
let apiCache = {}
try { apiCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8') || '{}') } catch {}
const saveCache = () => {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(apiCache, null, 2))
  } catch {}
}

/**
 * createDetector - Factory function to create and register detectors
 * 
 * @param {string} name - Detector name
 * @param {string} type - 'checklist' | 'streak-ongoing' | 'streak-break'
 * @param {object} config - Type-specific config
 * 
 * Examples:
 * 
 *   // Checklist with API lookup
 *   createDetector('NutritionDetector', 'checklist', {
 *     dataSource: 'nutrition',
 *     expected: [{ key: 'Protein', api: 'proteins' }],
 *     extract: e => e.items,
 *     api: {
 *       url: item => `https://api.example.com/search?q=${item}`,
 *       transform: data => data.results[0],
 *       match: (result, expected) => result[expected.api] > 0
 *     }
 *   })
 */
function createDetector(name, type, config = {}) {
  let detector

  if (type === 'checklist') {
    const expected = (config.expected || []).map(e => 
      typeof e === 'string' ? { key: e } : e
    )

    // Build compareFn from api config if provided
    let compareFn = config.compare
    if (config.api && !compareFn) {
      const { url, transform, match, maxItems = 5, timeout = 3000, cacheKey } = config.api
      
      compareFn = async (items, expectedItems) => {
        const covered = new Set()
        const uniqueItems = [...new Set(items)].slice(0, maxItems)
        
        const results = await Promise.all(uniqueItems.map(async item => {
          const key = cacheKey ? cacheKey(item) : item
          if (apiCache[key]) return apiCache[key]
          if (process.env.FAST_MODE) return null
          
          try {
            const ctrl = new AbortController()
            setTimeout(() => ctrl.abort(), timeout)
            const res = await fetch(url(item), { signal: ctrl.signal })
            if (!res.ok) return null
            const data = await res.json()
            const result = transform ? transform(data) : data
            if (result) { apiCache[key] = result; saveCache() }
            return result
          } catch { return null }
        }))

        results.filter(Boolean).forEach(result => {
          expectedItems.forEach(exp => {
            if (match(result, exp)) covered.add(exp.key)
          })
        })

        return { covered, missing: expectedItems.map(e => e.key).filter(k => !covered.has(k)) }
      }
    }
    
    detector = new ChecklistDetector({
      name,
      dataSource: config.dataSource,
      severity: config.severity || 'info',
      expectedItems: expected,
      extractActual: config.extract || (e => e.items || []),
      compareFn,
      matchFn: config.match,
      todayOnly: config.todayOnly !== false,
      dateFilter: config.dateFilter,
      aggregate: config.aggregate || false,
      message: config.message || (missing => `Missing: ${missing.join(', ')}`)
    })
  } 
  else if (type === 'streak-ongoing' || type === 'streak-break') {
    detector = new StreakDetector({
      name,
      dataSource: config.dataSource,
      minRepeat: config.minRepeat || 3,
      triggerOn: type === 'streak-break' ? 'break' : 'ongoing',
      severity: config.severity || (type === 'streak-break' ? 'warning' : 'info'),
      message: config.message
    })
  }
  else {
    throw new Error(`Unknown detector type: ${type}`)
  }

  registry.push(detector)
  return detector
}

// Get all registered detectors
createDetector.getAll = () => registry

// Clear registry (for testing)
createDetector.clear = () => registry.length = 0

module.exports = createDetector
