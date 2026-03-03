const availableDetectors = require('./index')
const ContextBasedFilter = require('../detectors-filter/ContextBasedFilter')

class DetectorManager {
  constructor(options = {}) {
    this.options = options || {}

    // Load all detectors
    let detectors = availableDetectors

    // Optional: filter by specific detector name
    if (this.options.only) {
      detectors = detectors.filter(detector =>
        detector.name === this.options.only ||
        detector.detector === this.options.only
      )
    }

    this.detectors = detectors
    this.filterMechanism =
      this.options.filterMechanism || new ContextBasedFilter()
    this.globalContext = this.options.context || {}
  }

  async runOnStitched(stitchedData) {
    const entryPromises = Object.values(stitchedData).map(async (stitchedEntry) => {

      const events = Array.isArray(stitchedEntry?.events)
        ? stitchedEntry.events
        : []

      const categories = Array.from(
        new Set(
          events
            .map(e => (e && e.category) || '')
            .filter(Boolean)
        )
      )

      const context = { ...this.globalContext }
      if (categories.length === 1) {
        context.category = categories[0]
      }

      const selectedDetectors = this.filterMechanism.filter(
        this.detectors,
        stitchedEntry,
        context
      )

      const detectorPromises = selectedDetectors.map(async (detector) => {

        // Respect detector dataSource
        if (detector.dataSource) {
          const hasCategory = events.some(
            ev => (ev && ev.category) === detector.dataSource
          )
          if (!hasCategory) return []
        }

        try {
          const results = await detector.detect(stitchedEntry)
          return Array.isArray(results) ? results : []
        } catch (err) {
          console.error('Detector error', detector.name || detector.detector, err?.message)
          return []
        }
      })

      const results = await Promise.all(detectorPromises)
      return results.flat()
    })

    const findingsNested = await Promise.all(entryPromises)
    let findings = findingsNested.flat()

    // Call finalize() on aggregate detectors
    for (const detector of this.detectors) {
      if (detector.finalize) {
        try {
          const finalFindings = await detector.finalize()
          if (Array.isArray(finalFindings)) findings = findings.concat(finalFindings)
        } catch (err) {
          console.error('Detector finalize error', detector.name, err?.message)
        }
      }
    }

    return findings
  }
}

module.exports = DetectorManager