function safeParseDate(dateValue) {
  const d = new Date(dateValue)
  return isNaN(d.getTime()) ? null : d
}

function getTypeCounts(events) {
  const typeCounts = {}
  for (const ev of events) {
    const cat = (ev && ev.category) || ''
    const sub = (ev && ev.subcategory) || ''
    const k = `${cat}|${sub}`
    typeCounts[k] = (typeCounts[k] || 0) + 1
  }
  return typeCounts
}

function getMostCommon(typeCounts) {
  let mostCommonKey = null
  let mostCommonCount = 0
  for (const [k, c] of Object.entries(typeCounts)) {
    if (c > mostCommonCount) { mostCommonKey = k; mostCommonCount = c }
  }
  return { mostCommonKey, mostCommonCount }
}

function matchedEventsForKey(events, key) {
  const [commonCategory, commonSubcategory] = (key || '').split('|')
  return events.filter(ev => (((ev && ev.category) || '') === commonCategory) && (((ev && ev.subcategory) || '') === commonSubcategory))
}

function predictNextDateFromEvents(matchedEvents) {
  const eventDates = matchedEvents
    .map(e => safeParseDate(e.createdAt))
    .filter(Boolean)
    .sort((a,b) => a - b)

  if (eventDates.length < 2) return null

  const eventIntervals = []
  for (let i = 1; i < eventDates.length; i++) {
    eventIntervals.push(eventDates[i] - eventDates[i - 1])
  }

  if (!eventIntervals.length) return null

  const sorted = eventIntervals.slice().sort((a,b)=>a-b)
  const mid = Math.floor(sorted.length / 2)
  const medianInterval = sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2
  if (!medianInterval) return null

  const lastEventDate = eventDates[eventDates.length - 1]
  return new Date(lastEventDate.getTime() + medianInterval)
}

module.exports = {
  safeParseDate,
  getTypeCounts,
  getMostCommon,
  matchedEventsForKey,
  predictNextDateFromEvents
}
