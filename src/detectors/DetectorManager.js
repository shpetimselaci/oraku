const availableDetectors = require('./index')

class DetectorManager {
  constructor(options = {}){
    this.options = options || {}
    // allow filtering detectors by name via `options.only`
    if (this.options.only) {
      this.selectedDetectors = availableDetectors.filter(detector =>
        (detector.name === this.options.only) || (detector.detector === this.options.only)
      )
    } else {
      this.selectedDetectors = availableDetectors
    }
  }

  async runOnStitched(stitchedData){
    const allFindings = []
    for (const [entryKey, stitchedEntry] of Object.entries(stitchedData)){
      for (const detector of this.selectedDetectors){
        try{
          const detectorResults = await detector.detect(stitchedEntry)
          if (Array.isArray(detectorResults) && detectorResults.length) {
            for (const finding of detectorResults) allFindings.push(finding)
          }
        }catch(err){ console.error('detector error', detector.name || detector.detector, err && err.message) }
      }
    }
    return allFindings
  }
}

module.exports = DetectorManager
