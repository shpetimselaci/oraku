const EventCounter = require('./EventCounter')

const DETECTOR_NAME = 'RecurringEventDetector'
const MINIMUM_RECURRING_OCCURRENCES = 3
const TOLERANCE_MS = 24 * 60 * 60 * 1000 // 1 day tolerance

module.exports = {
  name: DETECTOR_NAME,
  description:
    'Detects recurring event patterns and predicts the next expected occurrence',

  minEvents: MINIMUM_RECURRING_OCCURRENCES,
  recurringThreshold: MINIMUM_RECURRING_OCCURRENCES,

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (events.length < MINIMUM_RECURRING_OCCURRENCES) return []

    const countsByType = EventCounter.countEventsByType(events)
    const { mostFrequentKey, highestCount } =
      EventCounter.findMostFrequentType(countsByType)

    if (!mostFrequentKey || highestCount < MINIMUM_RECURRING_OCCURRENCES)
      return []

    const recurringEvents =
      EventCounter.filterEventsByTypeKey(events, mostFrequentKey)

    if (recurringEvents.length < MINIMUM_RECURRING_OCCURRENCES)
      return []

    // Make sure events are sorted by date
    const sortedEvents = recurringEvents
      .map(e => ({ ...e, createdAt: new Date(e.createdAt) }))
      .sort((a, b) => a.createdAt - b.createdAt)

    const predictedNextOccurrence =
      EventCounter.predictNextOccurrenceFromEvents(sortedEvents)

    if (!predictedNextOccurrence) return []

    const now = new Date()

    // 🔥 NEW LOGIC: Disable if previous expected date wasn't processed
    if (predictedNextOccurrence > now) {
      const intervalMs =
        sortedEvents[1].createdAt - sortedEvents[0].createdAt

      const expectedPrevious =
        new Date(predictedNextOccurrence.getTime() - intervalMs)

      const previousEventExists = sortedEvents.some(event =>
        Math.abs(event.createdAt - expectedPrevious) <= TOLERANCE_MS
      )

      if (!previousEventExists) return []
    }

    return [
      {
        id: `recurring-${entry.externalRef}`,
        key: entry.externalRef,
        detector: DETECTOR_NAME,
        severity: 'info',
        message: 'Predicted next recurring event date',
        predictedNextDate: predictedNextOccurrence.toISOString(),
        evidence: sortedEvents.map(event => ({
          externalRef: event.externalRef,
          createdAt: event.createdAt,
          log: event.log
        }))
      }
    ]
  }
}