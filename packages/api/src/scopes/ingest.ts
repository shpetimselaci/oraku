import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { EventSchema } from '../schemas'
import { requireAuth, requireScope } from '../middleware'
import { resolveEvents, limitEventsPerUser, runIngest } from '../ingest'
import { store } from '../store'

const DEFAULT_RATE_LIMIT = 10

const ingestLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: (_req, res) => store.settings.get(res.locals.projectId)?.rateLimit ?? DEFAULT_RATE_LIMIT,
  keyGenerator: (req) => req.headers['x-api-key'] as string || 'unknown',
  message: { error: 'Too many requests, slow down.' },
  handler: (req, res) => {
    console.warn(`[rate-limit] ${req.ip} hit the ingest limit — key: ${req.headers['x-api-key'] ?? 'none'}`)
    res.status(429).json({ error: 'Too many requests, slow down.' })
  }
})

const router = Router()

router.post('/', requireAuth, requireScope('ingest'), ingestLimiter, async (req, res) => {
  const projectId: string = res.locals.projectId

  const resolved = await resolveEvents(req.body)
  if (!resolved) { res.status(400).json({ error: 'Provide events (array), url (string), or sources (array)' }); return }
  if (!resolved.length) { res.status(400).json({ error: 'No events found' }); return }

  const parsed = z.array(EventSchema).safeParse(resolved)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid events', issues: parsed.error.issues }); return }

  const result = await runIngest(projectId, limitEventsPerUser(parsed.data))
  res.json({ ok: true, ...result })
})

export default router
