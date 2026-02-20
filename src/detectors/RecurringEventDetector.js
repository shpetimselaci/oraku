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

module.exports = {
  name: DETECTOR_NAME,
  description: 'Detects recurring event patterns and predicts the next expected occurrence',

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (events.length < 2) return []

    // Require repeated, similar actions: pick the most common (category, subcategory)
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

    // if no action type appears at least twice, don't consider it recurring
    if (!mostCommonKey || mostCommonCount < 2) return []

    const [commonCategory, commonSubcategory] = mostCommonKey.split('|')
    const matchedRecurringEvents = events.filter(ev =>
      (((ev && ev.category) || '') === commonCategory) && (((ev && ev.subcategory) || '') === commonSubcategory)
    )

    if (matchedRecurringEvents.length < 2) return []

    const eventDates = matchedRecurringEvents
      .map(e => safeParseDate(e.createdAt))
      .filter(Boolean)
      .sort((a,b) => a - b)

    if (eventDates.length < 2) return []

    const eventIntervals = []
    for (let i = 1; i < eventDates.length; i++) {
      eventIntervals.push(eventDates[i] - eventDates[i - 1])
    }

    const medianInterval = calculateMedianInterval(eventIntervals)
    if (!medianInterval) return []

    const lastEventDate = eventDates[eventDates.length - 1]
    const predictedNextEventDate =
      new Date(lastEventDate.getTime() + medianInterval)

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