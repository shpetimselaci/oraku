const nlp = require('compromise')
const fs = require('fs')
const path = require('path')

// Collected findings for separate output file
const collectedFindings = []
const OUT_PATH = path.resolve('output', 'findings_random_engagement.json')

function flushToFile() {
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, JSON.stringify(collectedFindings, null, 2))
  } catch (e) {
    // best-effort logging
    console.error('RandomEngagementDetector: failed to write separate findings file', e && e.message)
  }
}

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

    const result = {
      id: `engage-${entry.externalRef || Date.now()}`,
      key: entry.externalRef || null,
      detector: NAME,
      severity: 'info',
      message: 'Detected potential engagement based on names mentioned in events',
      evidence: findings
    }

    // store and flush to separate file immediately
    try {
      collectedFindings.push(result)
      flushToFile()
    } catch (e) {
      console.error('RandomEngagementDetector: error saving separate finding', e && e.message)
    }

    // Return no findings so this detector's results are NOT included in the
    // main `output/findings.json`. The results remain available in
    // `output/findings_random_engagement.json`.
    return []
  }
}