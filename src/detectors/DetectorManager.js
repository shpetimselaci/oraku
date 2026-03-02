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
          const start = process.hrtime()
          const results = await detector.detect(stitchedEntry)
          const diff = process.hrtime(start)
          const ms = diff[0] * 1e3 + diff[1] / 1e6
          console.debug(`detector ${detector.name||detector.detector} for category=${detector.dataSource||context.category||'any'} took ${ms.toFixed(2)}ms`)
          return Array.isArray(results) ? results : []
        } catch (err) {
          console.error(
            'Detector error',
            detector.name || detector.detector,
            err?.message
          )
          return []
        }
      })

      const results = await Promise.all(detectorPromises)
      return results.flat()
    })

    const findingsNested = await Promise.all(entryPromises)
    return findingsNested.flat()
  }
}

module.exports = DetectorManager