import { Router } from 'express'
import { extractNextPredicted, toNextRun } from '../scheduler'
import { requireAuth, requireScope } from '../middleware'
import { store, saveSettings } from '../store'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/schedule', requireAuth, requireScope('notifications'), (_req, res) => {
  const result = store.results.get(res.locals.projectId)
  const nextPredicted = result ? extractNextPredicted(result.findings) : null
  res.json({ nextRun: toNextRun(nextPredicted), nextPredicted })
})

router.patch('/project/settings', requireAuth, requireScope('notifications'), (req, res) => {
  const projectId: string = res.locals.projectId
  const { webhookUrl } = req.body ?? {}
  if (typeof webhookUrl !== 'string') { res.status(400).json({ error: 'webhookUrl (string) is required' }); return }
  const existing = store.settings.get(projectId) ?? {}
  saveSettings(projectId, { ...existing, webhookUrl })
  res.json({ ok: true })
})

export default router
