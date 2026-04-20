import { Router } from 'express'
import { extractNextPredicted, toNextRun } from '../scheduler'
import { requireAuth, requireScope } from '../middleware'
import { store } from '../store'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/schedule', requireAuth, requireScope('notifications'), (_req, res) => {
  const result = store.results.get(res.locals.projectId)
  const nextPredicted = result ? extractNextPredicted(result.findings) : null
  res.json({ nextRun: toNextRun(nextPredicted), nextPredicted })
})

export default router
