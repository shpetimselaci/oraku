function parseDateSafely(dateValue) {
  const d = new Date(dateValue)
  return isNaN(d.getTime()) ? null : d
}

function countEventsByType(events) {
  const counts = {}
  for (const ev of events) {
    const cat = (ev && ev.category) || ''
    const sub = (ev && ev.subcategory) || ''
    const key = `${cat}|${sub}`
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function findMostFrequentType(countsByType) {
  let mostFrequentKey = null
  let highestCount = 0
  for (const [key, count] of Object.entries(countsByType)) {
    if (count > highestCount) {
      mostFrequentKey = key
      highestCount = count
    }
  }
  return { mostFrequentKey, highestCount }
}

function filterEventsByTypeKey(events, key) {
  const [cat, sub] = (key || '').split('|')
  return events.filter(ev => ((ev && ev.category) || '') === cat && ((ev && ev.subcategory) || '') === sub)
}

function predictNextOccurrenceFromEvents(events) {
  const dates = events.map(e => parseDateSafely(e.createdAt)).filter(Boolean).sort((a,b) => a - b)
  if (dates.length < 2) return null

  const intervals = []
  for (let i = 1; i < dates.length; i++) intervals.push(dates[i] - dates[i-1])
  if (!intervals.length) return null

  intervals.sort((a,b) => a-b)
  const mid = Math.floor(intervals.length / 2)
  const medianInterval = intervals.length % 2 ? intervals[mid] : (intervals[mid-1] + intervals[mid]) / 2
  return new Date(dates[dates.length-1].getTime() + medianInterval)
}

module.exports = {
  parseDateSafely,
  countEventsByType,
  findMostFrequentType,
  filterEventsByTypeKey,
  predictNextOccurrenceFromEvents
}