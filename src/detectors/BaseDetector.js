const moment = require('moment')

class BaseDetector {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name
    this.description = config.description || ''
    this.dataSource = config.dataSource || null
    this.severity = config.severity || 'info'
  }

  async detect(entry) {
    throw new Error(`${this.name}: detect() must be implemented`)
  }

  // Extracts events array from entry (handles both {events:[]} and raw array)
  extractEventsFromEntry(entry) {
    if (Array.isArray(entry?.events)) return entry.events
    if (Array.isArray(entry)) return entry
    return []
  }

  // Alias for backward compatibility
  getEvents(entry) { return this.extractEventsFromEntry(entry) }

  // ============ Date Utilities ============

  toMoment(dateValue) {
    if (!dateValue) return null
    const m = moment(dateValue)
    return m.isValid() ? m : null
  }

  isDateToday(date) {
    return moment(date).isSame(moment(), 'day')
  }

  getTodayAsISOString() {
    return moment().format('YYYY-MM-DD')
  }

  // Alias for backward compatibility
  getTodayString() { return this.getTodayAsISOString() }

  filterEventsFromToday(events) {
    const today = moment().startOf('day')
    return events.filter(ev => {
      const m = moment(ev.createdAt || ev.date)
      return m.isValid() && m.isSame(today, 'day')
    })
  }

  // Alias for backward compatibility
  filterTodayEvents(events) { return this.filterEventsFromToday(events) }

  filterEventsByDateRange(events, targetDate, unit = 'day') {
    const target = moment(targetDate)
    return events.filter(ev => {
      const m = moment(ev.createdAt || ev.date)
      return m.isValid() && m.isSame(target, unit)
    })
  }

  // Alias for backward compatibility
  filterEventsByDate(events, date, unit) { return this.filterEventsByDateRange(events, date, unit) }

  // ============ Finding Builder ============

  buildFinding({ id, message, evidence = [], ...extra }) {
    return {
      id: id || `${this.name.toLowerCase()}-${Date.now()}`,
      detector: this.name,
      severity: extra.severity || this.severity,
      message,
      evidence,
      ...extra
    }
  }

  // Alias for backward compatibility
  createFinding(opts) { return this.buildFinding(opts) }
}

module.exports = BaseDetector
