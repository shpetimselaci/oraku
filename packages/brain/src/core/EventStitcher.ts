import type { Event, EventGroup, EventGroupMap } from '../types'

class EventStitcher {
  private events: Event[]

  constructor(events: Event[] = []) {
    this.events = events
  }

  stitch(): EventGroupMap {
    const map: Record<string, EventGroup> = {}

    for (const event of this.events) {
      const ref = typeof event.externalRef === 'string' ? event.externalRef : null
      if (!ref) continue

      if (!map[ref]) {
        map[ref] = { externalRef: ref, events: [], first: null, last: null, count: 0 }
      }

      map[ref].events.push(event)
      map[ref].count++

      const parsed = event.createdAt ? new Date(event.createdAt) : null
      const timestamp = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null
      if (timestamp) {
        if (!map[ref].first || timestamp < map[ref].first!) map[ref].first = timestamp
        if (!map[ref].last || timestamp > map[ref].last!) map[ref].last = timestamp
      }
    }

    return map
  }

  static toMarkdown(entry: EventGroup): string {
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

  toMarkdown(entry: EventGroup): string {
    return EventStitcher.toMarkdown(entry)
  }
}

export default EventStitcher
export { EventStitcher }
