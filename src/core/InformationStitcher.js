const types = require('../types')

class InformationStitcher {
  constructor(events = [], options = {}) {
    this.events = events
    this.options = options || {}
  }

  setEvents(events) {
    this.events = events
  }

  // Resolve a nested field from an object using a dot path e.g. 'meta.userId'
  resolveField(obj, fieldPath) {
    if (!obj) return undefined
    if (Array.isArray(fieldPath)) {
      for (const subPath of fieldPath) {
        const value = this.resolveField(obj, subPath)
        if (value !== undefined && value !== null) return value
      }
      return undefined
    }
    const pathParts = String(fieldPath).split('.')
    let current = obj
    for (const part of pathParts) {
      if (current == null) return undefined
      current = current[part]
    }
    return current
  }

  stitchByField(field) {
    const stitchedMap = {}
    for (const event of this.events) {
      let groupKey = this.resolveField(event, field)
      if (groupKey === undefined || groupKey === null) groupKey = 'unknown'
      if (typeof groupKey === 'object') groupKey = JSON.stringify(groupKey)
      const keyString = String(groupKey)
      if (!stitchedMap[keyString]) stitchedMap[keyString] = { externalRef: keyString, events: [], first: null, last: null, count: 0, _refs: new Set() }
      const stitchedEntry = stitchedMap[keyString]
      // deduplicate by externalRef (fallback to stringified event)
      const externalRefOrFallback = (event && (event.externalRef || (event.meta && (event.meta.externalRef || event.meta.external_ref)))) || JSON.stringify(event)
      if (stitchedEntry._refs.has(externalRefOrFallback)) continue
      stitchedEntry._refs.add(externalRefOrFallback)
      stitchedEntry.events.push(event)
      stitchedEntry.count = stitchedEntry.events.length
      const timestamp = event && event.createdAt ? new Date(event.createdAt).toISOString() : null
      if (timestamp) {
        if (!stitchedEntry.first || timestamp < stitchedEntry.first) stitchedEntry.first = timestamp
        if (!stitchedEntry.last || timestamp > stitchedEntry.last) stitchedEntry.last = timestamp
      }
    }
    // remove internal _refs sets before returning
    for (const stitchedEntryValue of Object.values(stitchedMap)) {
      if (stitchedEntryValue._refs) delete stitchedEntryValue._refs
    }
    return stitchedMap
  }

  stitchByExternalRef() {
    return this.stitchByField(['externalRef', 'meta.userId', 'meta.externalRef'])
  }

  // Generic entry point to produce a stitched map using options or provided groupBy
  stitch(opts = {}) {
    const groupBy = opts.groupBy || this.options.groupBy || ['externalRef', 'meta.userId', 'meta.externalRef']
    return this.stitchByField(groupBy)
  }

  toMarkdown(entry) {
    const lines = []
    lines.push(`# Stitched summary — ${entry.externalRef}`)
    lines.push(`- events: ${entry.count}`)
    if (entry.first) lines.push(`- first: ${entry.first}`)
    if (entry.last) lines.push(`- last: ${entry.last}`)
    lines.push('\n## Sample events')
    const sample = (entry.events || []).slice(0, 5).map(e => `- ${e && e.createdAt ? e.createdAt : 'unknown'} — ${e && (e.log || e.action) ? (e.log || e.action) : JSON.stringify(e && e.meta ? e.meta : {})}`)
    lines.push(...sample)
    return lines.join('\n')
  }
}

module.exports = InformationStitcher
