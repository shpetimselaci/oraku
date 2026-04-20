import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ProjectSettings } from './scheduler'
import { store, saveSettings } from './store'

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) { res.status(503).json({ error: 'Admin not configured — set ADMIN_SECRET env var' }); return }
  if (req.headers['x-admin-secret'] as string !== secret) { res.status(401).json({ error: 'Invalid admin secret' }); return }
  next()
}

router.post('/project/settings', requireAdmin, (req, res) => {
  const projectId = (req.body?.projectId ?? '').trim()
  if (!projectId) { res.status(400).json({ error: 'projectId is required' }); return }
  const incoming: ProjectSettings = req.body
  const existing = store.settings.get(projectId) ?? {}
  saveSettings(projectId, { ...existing, ...incoming })
  res.json({ ok: true })
})

export default router
