const moment = require('moment')
const BaseDetector = require('./BaseDetector')

class ChecklistDetector extends BaseDetector {
  constructor(config) {
    super(config)
    this.expectedItems = config.expectedItems || []
    this.extractActual = config.extractActual || (e => e.name?.toLowerCase() || '')
    this.matchFn = config.matchFn || null
    this.compareFn = config.compareFn || null
    this.messageFn = config.message || ((missing) => `Missing: ${missing.join(', ')}`)
    this.todayOnly = config.todayOnly !== false
    this.dateFilter = config.dateFilter || null
    this.aggregate = config.aggregate || false  // true = one finding for all entries
    this._aggregatedItems = []  // collects items across entries when aggregate=true
  }

  async detect(entry) {
    let events = this.getEvents(entry)
    if (!events.length) return []

    // Filter by date
    if (this.todayOnly) {
      events = this.filterTodayEvents(events)
    } else if (this.dateFilter) {
      events = this._filterByDateRange(events, this.dateFilter)
    }
    
    if (!events.length) return []

    const actualItems = events.flatMap(e => {
      const extracted = this.extractActual(e)
      return Array.isArray(extracted) ? extracted : [extracted]
    }).filter(Boolean)

    if (!actualItems.length) return []

    // If aggregating, collect and return empty (finalize later)
    if (this.aggregate) {
      this._aggregatedItems.push(...actualItems)
      return []
    }

    return this._buildFindings(actualItems, entry)
  }

  // Called after all entries processed (for aggregate mode)
  async finalize() {
    if (!this.aggregate || !this._aggregatedItems.length) return []
    const findings = await this._buildFindings(this._aggregatedItems, null)
    this._aggregatedItems = []
    return findings
  }

  async _buildFindings(actualItems, entry) {
    let covered = new Set()
    let missing = []

    if (this.compareFn) {
      const result = await this.compareFn(actualItems, this.expectedItems, [])
      covered = result.covered || new Set()
      missing = result.missing || []
    } else {
      const normalizedActual = actualItems.map(a => 
        typeof a === 'string' ? a.toLowerCase() : a
      )

      for (const expected of this.expectedItems) {
        const isMatched = this.matchFn 
          ? normalizedActual.some(actual => this.matchFn(actual, expected))
          : normalizedActual.some(actual => 
              expected.keywords?.some(k => actual.includes(k)) ||
              actual.includes(expected.key?.toLowerCase())
            )
        if (isMatched) covered.add(expected.key)
      }

      missing = this.expectedItems.map(e => e.key).filter(key => !covered.has(key))
    }

    if (!missing.length) return []

    const identifier = entry?.externalRef || (this.aggregate ? 'weekly' : 'check')
    const dateStr = this.getTodayString()

    return [this.createFinding({
      id: `${this.name.toLowerCase()}-${identifier}-${dateStr}`,
      severity: this.severity,
      message: typeof this.messageFn === 'function' ? this.messageFn(missing) : this.messageFn,
      evidence: {
        checked: [...new Set(actualItems)],
        covered: Array.from(covered),
        missing
      }
    })]
  }

  _filterByDateRange(events, filter) {
    const target = moment().startOf(filter.unit)
    if (filter.value) target.add(filter.value, filter.unit)
    return events.filter(ev => {
      const m = moment(ev.createdAt || ev.date)
      return m.isValid() && m.isSame(target, filter.unit)
    })
  }
}

module.exports = ChecklistDetector
