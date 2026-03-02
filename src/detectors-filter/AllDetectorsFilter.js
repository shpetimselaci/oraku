const MechanismToFilterDetectors = require('./MechanismToFilterDetectors')

class AllDetectorsFilter extends MechanismToFilterDetectors {
  filter(detectors) {
    return detectors
  }
}

module.exports = AllDetectorsFilter