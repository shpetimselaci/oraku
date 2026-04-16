import { readFileSync } from 'fs'
import { join } from 'path'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { getAllProjectSettings } from '@oraku/brain'
import { store, saveSettings } from '../store'

const DASHBOARD_HTML = readFileSync(join(__dirname, 'admin-dashboard.html'), 'utf8')
const DASHBOARD_JS = readFileSync(join(__dirname, 'admin-dashboard.js'), 'utf8')

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    res.status(503).json({ error: 'Admin not configured — set ADMIN_SECRET env var' })
    return
  }
  if (req.headers['x-admin-secret'] as string !== secret) {
    res.status(401).json({ error: 'Invalid admin secret' })
    return
  }
  next()
}

router.get('/admin/settings', requireAdmin, (_req, res) => {
  const all = getAllProjectSettings()
  const result: Record<string, object> = {}
  for (const [key, val] of all) result[key] = val
  res.json(result)
})

router.patch('/admin/settings/:apiKey', requireAdmin, (req, res) => {
  const apiKey = req.params.apiKey as string
  const existing = store.settings.get(apiKey) ?? {}
  const updated = { ...existing, ...req.body }
  saveSettings(apiKey, updated)
  res.json({ ok: true, settings: updated })
})

router.get('/admin', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(DASHBOARD_HTML)
})

router.get('/admin/dashboard.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.send(DASHBOARD_JS)
})

export default router
