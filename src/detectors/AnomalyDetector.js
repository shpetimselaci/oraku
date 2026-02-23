const EventCounter = require('./EventCounter')
// configure threshold here: number of repeats required to consider anomaly detection
const anomalyThreshold = 5

const DETECTOR_NAME = 'AnomalyDetector'

function safeParseDate(dateValue) {
  try { return new Date(dateValue) }
  catch { return null }
}

module.exports = {
  name: DETECTOR_NAME,
  description: 'Detects when a repeating action (>=5 times) stops unexpectedly and emits a warning',

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (!events.length) return []

    // Count action types (category|subcategory)
    const typeCounts = {}
    for (const ev of events) {
      const cat = (ev && ev.category) || ''
      const sub = (ev && ev.subcategory) || ''
      const k = `${cat}|${sub}`
      typeCounts[k] = (typeCounts[k] || 0) + 1
    }

    let mostCommonKey = null
    let mostCommonCount = 0
    for (const [k, c] of Object.entries(typeCounts)) {
      if (c > mostCommonCount) { mostCommonKey = k; mostCommonCount = c }
    }

    // We're only interested in actions repeated >= anomalyThreshold
    const required = anomalyThreshold
    if (!mostCommonKey || mostCommonCount < required) return []

    const [commonCategory, commonSubcategory] = mostCommonKey.split('|')

    const matchedRecurringEvents = events.filter(ev =>
      (((ev && ev.category) || '') === commonCategory) && (((ev && ev.subcategory) || '') === commonSubcategory)
    )

    if (matchedRecurringEvents.length < required) return []

    // Predict next occurrence using internal event counters (avoid invoking other detectors)
    const predicted = EventCounter.predictNextDateFromEvents(matchedRecurringEvents)
      if (!predicted) return []

    const now = new Date()
    if (predicted < now) {
      const eventsAfterPredicted = events.some(ev => {
        const d = safeParseDate(ev.createdAt)
        return d && d > predicted
      })

      if (!eventsAfterPredicted) {
        return [{
          id: `anomaly-stop-${entry.externalRef}`,
          key: entry.externalRef,
          detector: DETECTOR_NAME,
          severity: 'are you ok, you have suddenly stopped your routine!',
          message: `Action ${commonCategory}/${commonSubcategory} occurred ${mostCommonCount} times then stopped; expected at ${predicted.toISOString()} but was not observed.`,
          evidence: matchedRecurringEvents.map(e => ({ externalRef: e.externalRef, createdAt: e.createdAt, log: e.log }))
        }]
      }
    }
}
}