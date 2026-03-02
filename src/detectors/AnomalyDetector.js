const EventCounter = require('./EventCounter')

const DETECTOR_NAME = 'AnomalyDetector'
const MINIMUM_REPETITIONS_FOR_ANOMALY = 5

module.exports = {
  name: DETECTOR_NAME,
  description:
    'Detects when a frequently repeating action suddenly stops occurring',

  minEvents: MINIMUM_REPETITIONS_FOR_ANOMALY,
  recurringThreshold: MINIMUM_REPETITIONS_FOR_ANOMALY,

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (events.length < MINIMUM_REPETITIONS_FOR_ANOMALY) return []

    const countsByType = EventCounter.countEventsByType(events)
    const { mostFrequentKey, highestCount } =
      EventCounter.findMostFrequentType(countsByType)

    if (!mostFrequentKey || highestCount < MINIMUM_REPETITIONS_FOR_ANOMALY)
      return []

    const recurringEvents =
      EventCounter.filterEventsByTypeKey(events, mostFrequentKey)

    if (recurringEvents.length < MINIMUM_REPETITIONS_FOR_ANOMALY)
      return []

    const predictedNextOccurrence =
      EventCounter.predictNextOccurrenceFromEvents(recurringEvents)

    if (!predictedNextOccurrence) return []

    const now = new Date()

    // Only check anomaly if expected date already passed
    if (predictedNextOccurrence >= now) return []

    const hasEventAfterPrediction = events.some(event => {
      const eventDate = EventCounter.parseDateSafely(event.createdAt)
      return eventDate && eventDate > predictedNextOccurrence
    })

    if (hasEventAfterPrediction) return []

    const [category, subcategory] = mostFrequentKey.split('|')

    return [
      {
        id: `anomaly-stop-${entry.externalRef}`,
        key: entry.externalRef,
        detector: DETECTOR_NAME,
        severity: 'warning',
        message: `Recurring action ${category}/${subcategory} stopped unexpectedly`,
        expectedAt: predictedNextOccurrence.toISOString(),
        evidence: recurringEvents.map(event => ({
          externalRef: event.externalRef,
          createdAt: event.createdAt,
          log: event.log
        }))
      }
    ]
  }
}