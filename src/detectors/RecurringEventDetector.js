function safeParseDate(dateValue) {
  try { return new Date(dateValue) }
  catch { return null }
}

function calculateMedianInterval(intervals) {
  if (!intervals.length) return null
  const sorted = intervals.slice().sort((a,b)=>a-b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid-1] + sorted[mid]) / 2
}

const DETECTOR_NAME = 'RecurringEventDetector'
const EventCounter = require('./EventCounter')
// set the minimal number of repeated events to consider recurring
const recurringThreshold = 3

module.exports = {
  name: DETECTOR_NAME,
  description: 'Detects recurring event patterns and predicts the next expected occurrence',

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (events.length < recurringThreshold) return []

    // Require repeated, similar actions: pick the most common (category, subcategory)
    const typeCounts = EventCounter.getTypeCounts(events)
    const { mostCommonKey, mostCommonCount } = EventCounter.getMostCommon(typeCounts)

    // if no action type appears at least `recurringThreshold`, don't consider it recurring
    if (!mostCommonKey || mostCommonCount < recurringThreshold) return []

    const matchedRecurringEvents = EventCounter.matchedEventsForKey(events, mostCommonKey)

    if (matchedRecurringEvents.length < recurringThreshold) return []

    const predictedNextEventDate = EventCounter.predictNextDateFromEvents(matchedRecurringEvents)
    if (!predictedNextEventDate) return []

    return [{
      id: `recurring-${entry.externalRef}`,
      key: entry.externalRef,
      detector: DETECTOR_NAME,
      severity: 'info',
      message: 'Predicted next recurring event date',
      predictedNextDate: predictedNextEventDate.toISOString(),
      evidence: matchedRecurringEvents.map(event => ({
        externalRef: event.externalRef,
        createdAt: event.createdAt,
        log: event.log
      }))
    }]
  }
}