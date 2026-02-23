const nlp = require('compromise')

function extractNames(text) {
  if (!text) return []

  const tokens = text
    .split(/\s+/) // split by whitespace
    .map(t => t.trim().replace(/^[',"]+|[',"]+$/g, '')) // trim punctuation/quotes
    .filter(Boolean)
    .filter(t => /^[a-z]/.test(t)) // start with lowercase

  const meaningful = tokens.filter(t => /[\d_@.]/.test(t) || t.length > 3)

  return Array.from(new Set(meaningful))
}

const NAME = 'RandomEngagementDetector'

module.exports = {
  name: NAME,

  async detect(entry) {
  const events = Array.isArray(entry?.events) ? entry.events : []
  if (!events.length) return []

  const findings = []

  for (const event of events) {
    const eventText = [
      event.title,
      event.log,
      event.category,
      Array.isArray(event.tags) ? event.tags.join(' ') : event.tags
    ]
      .filter(Boolean)
      .join(' ')

    const names = extractNames(eventText)
    if (!names.length) continue

    findings.push({
      externalRef: event.externalRef || null,
      names,
      createdAt: event.createdAt || null
    })
  }

  if (!findings.length) return []

  return [{
    id: `engage-${entry.externalRef || Date.now()}`,
    key: entry.externalRef || null,
    detector: NAME,
    severity: 'info',
    message: 'Detected potential engagement based on names mentioned in events',
    evidence: findings
  }]
  }
}