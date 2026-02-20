const natural = require('natural')

const tokenizer = new natural.WordTokenizer()
const wordRootExtractor = natural.PorterStemmer // Turn words into their root form (e.g. "coding" -> "code") to improve matching against keywords
const stopwords = natural.stopwords || natural.ignoredWords || []
const ignoredWords = new Set(stopwords)

function tokenize(text) {
  return tokenizer
    .tokenize(text.toLowerCase())
    .filter(word => word && !ignoredWords.has(word) && word.length > 2)
    .map(word => wordRootExtractor.stem(word))
}

const NAME = 'RandomEngagementDetector'

module.exports = {
  name: NAME,

  async detect(entry) {
    const events = Array.isArray(entry?.events) ? entry.events : []
    if (!events.length) return [] // no activity

    // Single interest bucket collecting compact tokens and action verbs
    const topicData = { interest: [] }

    for (const event of events) {
      // Combine all text from current event into one string for keyword matching
      const eventText = [
        event.title,
        event.log,
        event.category,
        Array.isArray(event.tags) ? event.tags.join(' ') : event.tags
      ]
        .filter(Boolean)
        .map(v => (typeof v === 'string' ? v : String(v)))
        .join(' ')

      const tokens = tokenize(eventText)

      // detect generic engagement actions (install/download/view/etc.) and record interest
      const ACTION_VERBS = ['download','install','view','open','click','subscribe','signup','purchase']
      const STEMMED_ACTIONS = ACTION_VERBS.map(a => wordRootExtractor.stem(a))
      const matchedActions = STEMMED_ACTIONS.filter(av => tokens.includes(av))

      // derive compact interest tokens from the event text (keep up to 12)
      const interestTokens = Array.from(new Set(tokens.filter(t => !ignoredWords.has(t) && t.length > 2))).slice(0,12)

      // include category/subcategory and username as lightweight metadata
      const displayName = (event && event.log) || (event && event.meta && event.meta.username) || null
      const metaCategory = event && event.category ? String(event.category) : null
      const metaSubcategory = event && event.subcategory ? String(event.subcategory) : null
      if (metaCategory) interestTokens.unshift(metaCategory)
      if (metaSubcategory) interestTokens.unshift(metaSubcategory)

      // only record interest when we detected an explicit action verb
      if (matchedActions.length > 0) {
        topicData.interest.push({
          externalRef: event && event.externalRef ? event.externalRef : null,
          name: displayName,
          interests: interestTokens,
          actionVerbs: matchedActions,
          createdAt: event && event.createdAt ? event.createdAt : null
        })
      }
    }
    // If nothing was captured, don't emit a finding
    if (!Array.isArray(topicData.interest) || topicData.interest.length === 0) return []

    const ref = entry?.externalRef || entry?.id || `${Date.now()}`

    return [{
      id: `engage-${ref}`,
      key: ref,
      detector: NAME,
      severity: 'info',
      message: 'Interest evidence per event',
      topicData
    }]
  }
}