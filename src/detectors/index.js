const createDetector = require('./createDetector')

// ============ STREAK DETECTORS ============

// Predicts next occurrence of recurring events
createDetector('RecurringEventDetector', 'streak-ongoing', {
  minRepeat: 3,
  message: pattern => `🔄 "${pattern}" repeats regularly. Next expected: {{next}}`
})

// Alerts when a regular pattern stops
createDetector('AnomalyDetector', 'streak-break', {
  minRepeat: 5,
  severity: 'warning',
  message: pattern => `⚠️ "${pattern}" hasn't occurred as expected`
})

// ============ CHECKLIST DETECTORS ============

// Daily curriculum coverage
createDetector('DailyCurriculumDetector', 'checklist', {
  dataSource: 'curriculum',
  todayOnly: true,
  expected: [
    { key: 'reading', match: /reading|story|book/i },
    { key: 'playing', match: /play|game/i },
    { key: 'movement', match: /sport|running|gym|movement/i },
    { key: 'music', match: /music|sing|song/i },
    { key: 'art', match: /draw|paint|art|craft/i },
    { key: 'basics', match: /letter|number|alphabet/i }
  ],
  extract: e => [e.name || e.log || ''],
  match: (actual, expected) => expected.match.test(actual),
  message: missing => `📚 Missing today: ${missing.join(', ')}. Try these at home!`
})

// Daily nutrition with API lookup
createDetector('DailyNutritionDetector', 'checklist', {
  dataSource: 'nutrition',
  todayOnly: true,
  expected: [
    { key: 'Vitamin A', api: 'vitamin-a' },
    { key: 'Vitamin C', api: 'vitamin-c' },
    { key: 'Vitamin D', api: 'vitamin-d' },
    { key: 'Protein', api: 'proteins' },
    { key: 'Fiber', api: 'fiber' },
    { key: 'Calcium', api: 'calcium' },
    { key: 'Iron', api: 'iron' }
  ],
  extract: e => {
    if (Array.isArray(e.items)) return e.items
    if (e.log) return e.log.match(/\b[a-z]{3,}\b/gi) || []
    return []
  },
  api: {
    url: food => `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(food)}&search_simple=1&action=process&json=1&fields=nutriments`,
    transform: data => data.products?.[0]?.nutriments,
    match: (nutriments, expected) => {
      const val = nutriments?.[`${expected.api}_value`] || nutriments?.[`${expected.api}_100g`] || nutriments?.[expected.api]
      return val && parseFloat(val) > 0
    },
    maxItems: 5,
    timeout: 3000
  },
  message: missing => `🥗 Missing nutrients today: ${missing.join(', ')}`
})

// Weekly curriculum (aggregate)
createDetector('WeeklyCurriculumDetector', 'checklist', {
  dataSource: 'curriculum',
  aggregate: true,
  dateFilter: e => {
    const d = new Date(e.createdAt || e.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo && d <= now
  },
  expected: [
    { key: 'reading', match: /reading|story|book/i },
    { key: 'music', match: /music|sing/i },
    { key: 'art', match: /draw|paint|art/i },
    { key: 'physical', match: /sport|running|gym|movement|play/i }
  ],
  extract: e => [e.name || e.log || ''],
  match: (actual, expected) => expected.match.test(actual),
  message: missing => `📅 This week is missing: ${missing.join(', ')}`
})

// ============ CUSTOM DETECTORS ============

// Recommendation detector (engagement tracking)
const RecommendationDetector = require('./RecommendationDetector')

module.exports = [...createDetector.getAll(), RecommendationDetector]
