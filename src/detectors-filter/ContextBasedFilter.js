const MechanismToFilterDetectors = require('./MechanismToFilterDetectors')
const EventCounter = require('../detectors/EventCounter')

class ContextBasedFilter extends MechanismToFilterDetectors {
  filter(detectors, stitchedEntry, context = {}) {
    const events = Array.isArray(stitchedEntry?.events)
      ? stitchedEntry.events
      : []

    const eventCount = events.length
    const typeCounts = EventCounter.countEventsByType(events)
    const { highestCount: mostCommonCount } = EventCounter.findMostFrequentType(typeCounts)

    return detectors.filter(detector => {

      // 1️⃣ Skip if detector requires minimum events
      if (detector.minEvents && eventCount < detector.minEvents) {
        return false
      }
      //mix
      // 2️⃣ Skip if detector requires recurring pattern
      if (detector.requiresRecurring && mostCommonCount < detector.recurringThreshold) {
        return false
      }

      // 3️⃣ Filter by supported categories
      if (
        detector.supportedCategories &&
        context.category &&
        !detector.supportedCategories.includes(context.category)
      ) {
        return false
      }

      return true
    })
  }
}

module.exports = ContextBasedFilter