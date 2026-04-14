import dayjs from 'dayjs'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { runPipeline } from '@oraku/brain/src/core/pipeline'
import { EventSchema } from '../schemas'
import type { SDKDetectorSchema } from '@oraku/brain/src/types'
import { toBuilder } from '../scheduler'
import { requireAuth } from '../middleware'
import { resolveEvents, limitEventsPerUser } from '../ingest'
import { store, saveDetectors } from '../store'

const ingestLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.headers['x-api-key'] as string || 'unknown',
  message: { error: 'Too many requests, slow down.' },
  handler: (req, res) => {
    console.warn(`[rate-limit] ${req.ip} hit the ingest limit — key: ${req.headers['x-api-key'] ?? 'none'}`)
    res.status(429).json({ error: 'Too many requests, slow down.' })
  }
})

const router = Router()

router.post('/', requireAuth, ingestLimiter, async (req, res) => {
  const apiKey: string = res.locals.apiKey

  const resolved = await resolveEvents(req.body)
  if (!resolved) { res.status(400).json({ error: 'Provide events (array), url (string), or sources (array)' }); return }
  if (!resolved.length) { res.status(400).json({ error: 'No events found' }); return }

  const parsed = z.array(EventSchema).safeParse(resolved)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid events', issues: parsed.error.issues }); return }

  const allEvents = limitEventsPerUser(parsed.data)

  const existing = store.detectors.get(apiKey) ?? []
  const registeredMarkers = new Set(existing.map(d => d.marker).filter(Boolean))
  const newCategories = [...new Set(allEvents.map((e: any) => e.category).filter(Boolean))].filter(cat => !registeredMarkers.has(cat))
  if (newCategories.length > 0) {
    const autoConfigs: SDKDetectorSchema[] = newCategories.map(cat => ({
      name: `auto-${cat}`, type: 'streak-ongoing', marker: cat, minRepeat: 3, notificationType: 'reminder'
    }))
    saveDetectors(apiKey, [...existing, ...autoConfigs])
  }

  const settings = store.settings.get(apiKey)
  const result = await runPipeline(allEvents, {
    builders: (store.detectors.get(apiKey) ?? []).map(toBuilder),
    notificationsPerUser: settings?.notificationsPerUser
  })
  store.results.set(apiKey, result)
  store.events.set(apiKey, allEvents)
  store.runTimestamps.set(apiKey, dayjs().toISOString())

  res.json({ ok: true, count: result.count })
})

export default router
