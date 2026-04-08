import { Router } from 'express'
import { getDueNotifications, getDueNotificationsByUser, markDelivered } from '../@oraku/brain/src/db/notifications'
import type { Notification } from '../@oraku/brain/src/types'
import { extractNextPredicted, toNextRun, buildFindingMeta } from '../scheduler'
import { requireAuth } from '../middleware'
import { store } from '../store'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey
  const result = store.results.get(apiKey)
  if (!result) { res.status(404).json({ error: 'No data found — call /ingest first' }); return }

  const externalRef = req.query.externalRef as string | undefined
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
  let notifications: Notification[] = externalRef ? (result.notificationsByUser?.[externalRef] ?? []) : result.notifications
  if (limit) notifications = notifications.slice(0, limit)

  res.json({ notifications, count: notifications.length })
})

router.get('/latest', requireAuth, (_req, res) => {
  const apiKey: string = res.locals.apiKey
  const result = store.results.get(apiKey)
  if (!result) { res.status(404).json({ error: 'No data found — call /ingest first' }); return }

  const dueByUser = getDueNotificationsByUser()
  let latestCreatedAt: string | null = null
  const notificationsByUser: Record<string, Notification[]> = {}

  for (const [ref, dbNotifs] of Object.entries(dueByUser)) {
    notificationsByUser[ref] = dbNotifs.map(n => ({ ref, message: n.message, detector: n.detector ?? 'unknown', type: n.type, scheduledAt: n.scheduled_at }))
    for (const n of dbNotifs) if (!latestCreatedAt || n.created_at > latestCreatedAt) latestCreatedAt = n.created_at
  }

  const userGeneratedAt: Record<string, string> = {}
  store.userTimestamps.get(apiKey)?.forEach((ts, uid) => { userGeneratedAt[uid] = ts })

  const nextPredicted = extractNextPredicted(result.findings)
  res.json({
    ok: true,
    notificationsByUser,
    findingMetaByUser: buildFindingMeta(result.findings),
    userGeneratedAt,
    nextRun: toNextRun(nextPredicted),
    runTimestamp: store.runTimestamps.get(apiKey) ?? latestCreatedAt
  })
})

router.get('/due', (_req, res) => {
  const due = getDueNotifications()
  res.json({ notifications: due, count: due.length })
})

router.patch('/delivered', (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || !ids.length) { res.status(400).json({ error: 'ids must be a non-empty array' }); return }
  markDelivered(ids)
  res.json({ ok: true, delivered: ids.length })
})

export default router
