const moment = require('moment')
const BaseDetector = require('./BaseDetector')
const Counter = require('./EventCounter')

class StreakDetector extends BaseDetector {
  constructor(config) {
    super(config)
    this.minimumRepetitions = config.minRepeat || 3
    this.triggerMode = config.triggerOn || 'ongoing'
    this._messageFn = config.message
  }

  predictNext(sortedEvents) {
    if (sortedEvents.length < 2) return null
    const intervals = sortedEvents.slice(1).map((e, i) => e._m.diff(sortedEvents[i]._m)).sort((a, b) => a - b)
    const mid = Math.floor(intervals.length / 2)
    const median = intervals.length % 2 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2
    return sortedEvents[sortedEvents.length - 1]._m.clone().add(median, 'ms')
  }

  formatMessage(data) {
    if (this._messageFn) return this._messageFn(`${data.category}/${data.subcategory}`).replace('{{next}}', data.predictedDate?.split('T')[0] || 'soon')
    return this.triggerMode === 'break'
      ? `${data.category}/${data.subcategory} stopped unexpectedly`
      : `Predicted next ${data.category}/${data.subcategory}: ${data.predictedDate?.split('T')[0]}`
  }

  async detect(entry) {
    const events = this.extractEventsFromEntry(entry)
    if (events.length < this.minimumRepetitions) return []

    const { key, count } = Counter.getMostFrequent(Counter.countByType(events))
    if (!key || count < this.minimumRepetitions) return []

    const sorted = Counter.filterByType(events, key)
      .map(e => ({ ...e, _m: moment(e.createdAt) }))
      .filter(e => e._m.isValid())
      .sort((a, b) => a._m - b._m)

    if (sorted.length < this.minimumRepetitions) return []

    const predicted = this.predictNext(sorted)
    if (!predicted) return []

    const [category, subcategory] = key.split('|')
    const data = { category, subcategory, predictedDate: predicted.toISOString() }
    const evidence = sorted.map(e => ({ ref: e.externalRef, date: e.createdAt, log: e.log }))

    if (this.triggerMode === 'ongoing' && predicted.isAfter(moment())) {
      return [this.buildFinding({ id: `recurring-${entry.externalRef}`, key: entry.externalRef, message: this.formatMessage(data), predicted: predicted.toISOString(), evidence })]
    }

    if (this.triggerMode === 'break' && predicted.isBefore(moment())) {
      if (events.some(e => moment(e.createdAt).isAfter(predicted))) return []
      return [this.buildFinding({ id: `anomaly-${entry.externalRef}`, key: entry.externalRef, severity: 'warning', message: this.formatMessage(data), expected: predicted.toISOString(), evidence })]
    }

    return []
  }
}

module.exports = StreakDetector
