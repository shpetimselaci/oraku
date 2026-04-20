import { Router } from 'express'
import { getDueNotifications, markDelivered, getProjectSettings } from '@oraku/brain'
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
  const due = getDueNotifications()
  const byProject: Record<string, { webhookUrl: string | null; notifications: typeof due }> = {}
  for (const n of due) {
    const projectId = n.project_id ?? 'unknown'
    if (!byProject[projectId]) {
      const settings = n.project_id ? getProjectSettings(n.project_id) : {}
      byProject[projectId] = { webhookUrl: settings.webhookUrl ?? null, notifications: [] }
    }
    byProject[projectId].notifications.push(n)
  }
  res.json({ projects: Object.entries(byProject).map(([projectId, data]) => ({ projectId, ...data })) })
})

router.patch('/delivered', (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || !ids.length) { res.status(400).json({ error: 'ids must be a non-empty array' }); return }
  markDelivered(ids)
  res.json({ ok: true, delivered: ids.length })
})

export default router
