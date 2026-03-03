const MechanismToFilterDetectors = require('./MechanismToFilterDetectors')
const Counter = require('../detectors/EventCounter')

class ContextBasedFilter extends MechanismToFilterDetectors {
  filter(detectors, stitchedEntry, context = {}) {
    const events = Array.isArray(stitchedEntry?.events) ? stitchedEntry.events : []
    const { count: mostCommonCount } = Counter.getMostFrequent(Counter.countByType(events))

    return detectors.filter(d => {
      if (d.minEvents && events.length < d.minEvents) return false
      if (d.requiresRecurring && mostCommonCount < d.recurringThreshold) return false
      if (d.supportedCategories && context.category && !d.supportedCategories.includes(context.category)) return false
      return true
    })
  }
}

module.exports = ContextBasedFilter