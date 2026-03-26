import type { Event, EventGroup, EventGroupMap, InternalEventGroup, StitchOptions } from '../types'

class EventStitcher {
  private events: Event[]
  private options: StitchOptions

  constructor(events: Event[] = [], options: StitchOptions = {}) {
    this.events = events
    this.options = options
  }

  setEvents(events: Event[]): void {
    this.events = events
  }

  resolveField(obj: unknown, fieldPath: string | string[]): unknown {
    if (!obj) return undefined
    if (Array.isArray(fieldPath)) {
      for (const subPath of fieldPath) {
        const value = this.resolveField(obj, subPath)
        if (value !== undefined && value !== null) return value
      }
      return undefined
    }
    const pathParts = String(fieldPath).split('.')
    let current: unknown = obj
    for (const part of pathParts) {
      if (current == null) return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  stitchByField(field: string | string[]): EventGroupMap {
    const stitchedMap: Record<string, InternalEventGroup> = {}

    for (const event of this.events) {
      let groupKey = this.resolveField(event, field)
      if (groupKey === undefined || groupKey === null) continue
      if (typeof groupKey === 'object') groupKey = JSON.stringify(groupKey)
      const keyString = String(groupKey)

      if (!stitchedMap[keyString]) {
        stitchedMap[keyString] = {
          externalRef: keyString,
          events: [],
          first: null,
          last: null,
          count: 0,
          _refs: new Set()
        }
      }

      const stitchedEntry = stitchedMap[keyString]
      const metaObject = typeof event.meta === 'object' && event.meta !== null
        ? event.meta as Record<string, unknown>
        : undefined
      const eventExternalRef = typeof event.externalRef === 'string' ? event.externalRef : undefined
      const metaExternalRef = typeof metaObject?.externalRef === 'string' ? metaObject.externalRef : undefined
      const metaExternalRefAlt = typeof metaObject?.external_ref === 'string' ? metaObject.external_ref : undefined
      const externalRefOrFallback = eventExternalRef ?? metaExternalRef ?? metaExternalRefAlt ?? JSON.stringify(event)

      if (stitchedEntry._refs.has(String(externalRefOrFallback))) continue
      stitchedEntry._refs.add(String(externalRefOrFallback))
      stitchedEntry.events.push(event)
      stitchedEntry.count = stitchedEntry.events.length

      const parsed = event.createdAt ? new Date(event.createdAt) : null
      const timestamp = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null
      if (timestamp) {
        if (!stitchedEntry.first || timestamp < stitchedEntry.first) stitchedEntry.first = timestamp
        if (!stitchedEntry.last || timestamp > stitchedEntry.last) stitchedEntry.last = timestamp
      }
    }

    const result: EventGroupMap = {}
    for (const [key, entry] of Object.entries(stitchedMap)) {
      result[key] = {
        externalRef: entry.externalRef,
        events: entry.events,
        count: entry.count,
        first: entry.first,
        last: entry.last
      }
    }
    return result
  }

  stitchByExternalRef(): EventGroupMap {
    return this.stitchByField(['userId', 'user_id', 'uid', 'meta.userId', 'meta.user_id', 'meta.uid', 'meta.externalRef', 'meta.external_ref', 'externalRef', 'external_ref'])
  }

  stitch(opts: StitchOptions = {}): EventGroupMap {
    const groupBy = opts.groupBy || this.options.groupBy || ['userId', 'user_id', 'uid', 'meta.userId', 'meta.user_id', 'meta.uid', 'meta.externalRef', 'meta.external_ref', 'externalRef', 'external_ref']
    return this.stitchByField(groupBy)
  }

  toMarkdown(entry: EventGroup): string {
    const lines: string[] = []
    lines.push(`# Stitched summary — ${entry.externalRef}`)
    lines.push(`- events: ${entry.count}`)
    if (entry.first) lines.push(`- first: ${entry.first}`)
    if (entry.last) lines.push(`- last: ${entry.last}`)
    lines.push('\n## Sample events')
    const sample = (entry.events || []).slice(0, 5).map((e: Event) => {
      const time = e.createdAt
      const eventLog = typeof e.log === 'string' ? e.log : undefined
      const eventAction = typeof e.action === 'string' ? e.action : undefined
      const action = eventLog ?? eventAction ?? JSON.stringify(typeof e.meta === 'object' ? e.meta : {})
      return `- ${time} — ${action}`
    })
    lines.push(...sample)
    return lines.join('\n')
  }
}

export default EventStitcher
export { EventStitcher }
