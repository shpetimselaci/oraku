import dayjs from 'dayjs'
import { createHmac } from 'crypto'
import { runPipeline } from '@oraku/brain/src/core/pipeline'
import type { Event, Notification, SDKDetectorSchema } from '@oraku/brain/src/types'
import type { ProjectSettings } from '@oraku/brain'
import { toBuilder } from './scheduler'
import { store, saveDetectors } from './store'

const EVENTS_PER_USER = 50

async function fireWebhook(notifications: Notification[], settings: ProjectSettings): Promise<void> {
  if (!settings.webhookUrl) return
  const now = new Date()
  const due = notifications.filter(n => !n.scheduledAt || new Date(n.scheduledAt) <= now)
  if (!due.length) return

  const body = JSON.stringify({ notifications: due })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.webhookAuthKey) {
    headers['X-Oraku-Signature'] = 'sha256=' + createHmac('sha256', settings.webhookAuthKey).update(body).digest('hex')
  }

  try {
    const res = await fetch(settings.webhookUrl, { method: 'POST', headers, body })
    if (!res.ok) console.warn(`[ingest] Webhook delivery failed (${res.status})`)
  } catch (err) {
    console.warn(`[ingest] Webhook error: ${(err as Error).message}`)
  }
}

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

export async function runIngest(projectId: string, events: Event[]): Promise<{ count: number }> {
  const existing = store.detectors.get(projectId) ?? []
  const registeredMarkers = new Set(existing.map(d => d.marker).filter(Boolean))
  const newCategories = [...new Set(events.map((e: any) => e.category).filter(Boolean))].filter(cat => !registeredMarkers.has(cat))
  if (newCategories.length > 0) {
    const autoConfigs: SDKDetectorSchema[] = newCategories.map(cat => ({
      name: `auto-${cat}`, type: 'streak-ongoing', marker: cat, minRepeat: 3, notificationType: 'reminder'
    }))
    saveDetectors(projectId, [...existing, ...autoConfigs])
  }

  const settings = store.settings.get(projectId)
  const result = await runPipeline(events, {
    builders: (store.detectors.get(projectId) ?? []).map(toBuilder),
    notificationsPerUser: settings?.notificationsPerUser,
    projectId
  })
  store.results.set(projectId, result)
  store.events.set(projectId, events)
  store.runTimestamps.set(projectId, dayjs().toISOString())

  if (settings?.webhookUrl) await fireWebhook(result.notifications, settings)

  return { count: result.count }
}
