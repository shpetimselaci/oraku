import { Router } from 'express'
import { extractNextPredicted, toNextRun, type ProjectSettings } from '../scheduler'
import { requireAuth } from '../middleware'
import { store, saveSettings } from '../store'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.post('/project/settings', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey
  const incoming: ProjectSettings = req.body
  const existing = store.settings.get(apiKey) ?? {}
  saveSettings(apiKey, { ...existing, ...incoming })
  res.json({ ok: true })
})

router.get('/schedule', requireAuth, (_req, res) => {
  const result = store.results.get(res.locals.apiKey)
  const nextPredicted = result ? extractNextPredicted(result.findings) : null
  res.json({ nextRun: toNextRun(nextPredicted), nextPredicted })
})

export default router
