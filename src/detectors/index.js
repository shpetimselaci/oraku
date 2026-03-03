const createDetector = require('./createDetector')

createDetector('RecurringEventDetector', 'streak-ongoing', {
  minRepeat: 3,
  message: pattern => `🔄 "${pattern}" repeats regularly. Next expected: {{next}}`
})

createDetector('AnomalyDetector', 'streak-break', {
  minRepeat: 5,
  severity: 'warning',
  message: pattern => `⚠️ "${pattern}" hasn't occurred as expected`
})

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
  extract: entry => [entry.name || entry.log || ''],
  match: (actual, expected) => expected.match.test(actual),
  message: missing => `📚 Missing today: ${missing.join(', ')}. Try these at home!`
})

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
  extract: entry => {
    if (Array.isArray(entry.items)) return entry.items
    if (entry.log) return entry.log.match(/\b[a-z]{3,}\b/gi) || []
    return []
  },
  api: {
    url: food => `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(food)}&search_simple=1&action=process&json=1&fields=nutriments`,
    transform: data => data.products?.[0]?.nutriments,
    match: (nutriments, expected) => {
      const value = nutriments?.[`${expected.api}_value`] || nutriments?.[`${expected.api}_100g`] || nutriments?.[expected.api]
      return value && parseFloat(value) > 0
    },
    maxItems: 5,
    timeout: 3000
  },
  message: missing => `🥗 Missing nutrients today: ${missing.join(', ')}`
})

createDetector('WeeklyCurriculumDetector', 'checklist', {
  dataSource: 'curriculum',
  aggregate: true,
  dateFilter: entry => {
    const entryDate = new Date(entry.createdAt || entry.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return entryDate >= weekAgo && entryDate <= now
  },
  expected: [
    { key: 'reading', match: /reading|story|book/i },
    { key: 'music', match: /music|sing/i },
    { key: 'art', match: /draw|paint|art/i },
    { key: 'physical', match: /sport|running|gym|movement|play/i }
  ],
  extract: entry => [entry.name || entry.log || ''],
  match: (actual, expected) => expected.match.test(actual),
  message: missing => `📅 This week is missing: ${missing.join(', ')}`
})

const RecommendationDetector = require('./RecommendationDetector')

module.exports = [...createDetector.getAll(), RecommendationDetector]
