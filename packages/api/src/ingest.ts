import type { Event } from '../../oraku-main/src/types'

const EVENTS_PER_USER = 50

export function limitEventsPerUser(events: Event[]): Event[] {
  const counts: Record<string, number> = {}
  return events.filter(e => {
    const ref = typeof e.externalRef === 'string' ? e.externalRef : '__unknown__'
    counts[ref] = (counts[ref] ?? 0) + 1
    return counts[ref] <= EVENTS_PER_USER
  })
}

async function fetchEvents(url: string): Promise<Event[]> {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as Event[] | { events?: Event[] }
  return Array.isArray(data) ? data : (data.events ?? [])
}

export async function resolveEvents(body: Record<string, unknown>): Promise<Event[] | null> {
  const { events, url, sources } = body

  if (Array.isArray(events)) return events as Event[]

  if (typeof url === 'string') {
    const resolved = await fetchEvents(url)
    return resolved.length ? resolved : null
  }

  if (Array.isArray(sources)) {
    const all: Event[] = []
    for (const source of sources as Array<{ events?: Event[]; url?: string }>) {
      if (Array.isArray(source.events)) all.push(...source.events)
      else if (typeof source.url === 'string') {
        try { all.push(...await fetchEvents(source.url)) } catch { continue }
      }
    }
    return all
  }

  return null
}
