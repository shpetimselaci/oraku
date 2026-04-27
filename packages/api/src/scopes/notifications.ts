import { Router } from 'express'
import type { Notification } from '@oraku/brain'
import { requireAuth, requireScope } from '../middleware'
import { buildLatestPayload } from '../scheduler'
import { store } from '../store'

const router = Router()

router.get('/', requireAuth, requireScope('notifications'), (req, res) => {
  const projectId: string = res.locals.projectId
  const result = store.results.get(projectId)
  if (!result) { res.status(404).json({ error: 'No data found — call /ingest first' }); return }

  const externalRef = req.query.externalRef as string | undefined
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
  let notifications: Notification[] = externalRef ? (result.notificationsByUser?.[externalRef] ?? []) : result.notifications
  if (limit) notifications = notifications.slice(0, limit)

  res.json({ notifications, count: notifications.length })
})

router.get('/latest', requireAuth, requireScope('notifications'), (_req, res) => {
  const projectId: string = res.locals.projectId
  const payload = buildLatestPayload(projectId, store)
  if (!payload) { res.status(404).json({ error: 'No data found — call /ingest first' }); return }
  res.json(payload)
})

router.get('/due', (_req, res) => {
  const now = new Date()
  const projects = []
  for (const [projectId, result] of store.results.entries()) {
    const settings = store.settings.get(projectId)
    if (!settings?.webhookUrl) continue
    const notifications = result.notifications.filter(n => !n.scheduledAt || new Date(n.scheduledAt) <= now)
    if (!notifications.length) continue
    projects.push({
      projectId,
      webhookUrl: settings.webhookUrl,
      webhookSecret: settings.webhookAuthKey ?? null,
      notifications
    })
  }
  res.json({ projects })
})

export default router
