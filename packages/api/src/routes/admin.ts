import { readFileSync } from 'fs'
import { join } from 'path'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { getAllProjectSettings } from '@oraku/brain'
import { createProject, listProjects, createApiKey, listApiKeys, revokeApiKey, getAuditLog, setProjectActive } from '../api-keys'
import { listRegistrations, getRegistration, updateRegistrationStatus } from '../registration'
import { randomUUID } from 'crypto'
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

router.patch('/admin/settings/:projectId', requireAdmin, (req, res) => {
  const projectId = req.params.projectId as string
  const existing = store.settings.get(projectId) ?? {}
  const updated = { ...existing, ...req.body }
  if (updated.webhookUrl && !updated.webhookAuthKey) updated.webhookAuthKey = randomUUID().replace(/-/g, '')
  saveSettings(projectId, updated)
  res.json({ ok: true, settings: updated })
})

router.get('/admin/registrations', requireAdmin, (_req, res) => {
  res.json(listRegistrations())
})

router.post('/admin/registrations/:id/approve', requireAdmin, async (req, res) => {
  const reg = getRegistration(req.params.id as string)
  if (!reg) { res.status(404).json({ error: 'Registration not found' }); return }
  if (reg.status !== 'pending') { res.status(409).json({ error: 'Already processed' }); return }

  const project = createProject(reg.name)
  const { rawKey } = createApiKey(project.id, `${reg.name} key`, ['ingest', 'notifications', 'detectors'])
  updateRegistrationStatus(reg.id, 'approved')

  try {
    await fetch(reg.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, key: rawKey, projectId: project.id })
    })
  } catch (err) {
    console.error(`[registration] Failed to deliver key to ${reg.webhook_url}:`, (err as Error).message)
  }

  res.json({ ok: true, projectId: project.id })
})

router.post('/admin/registrations/:id/reject', requireAdmin, (req, res) => {
  const reg = getRegistration(req.params.id as string)
  if (!reg) { res.status(404).json({ error: 'Registration not found' }); return }
  updateRegistrationStatus(reg.id, 'rejected')

  fetch(reg.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: false })
  }).catch(() => {})

  res.json({ ok: true })
})

router.get('/admin/projects', requireAdmin, (_req, res) => {
  res.json(listProjects())
})

router.post('/admin/projects', requireAdmin, (req, res) => {
  const name = (req.body?.name ?? '').trim()
  if (!name) { res.status(400).json({ error: 'name is required' }); return }
  const project = createProject(name)
  res.status(201).json(project)
})

router.patch('/admin/projects/:id', requireAdmin, (req, res) => {
  const active = req.body?.active
  if (typeof active !== 'boolean') { res.status(400).json({ error: 'active (boolean) is required' }); return }
  setProjectActive(req.params.id as string, active)
  res.json({ ok: true })
})

// API key management
router.get('/admin/keys', requireAdmin, (_req, res) => {
  res.json(listApiKeys())
})

router.post('/admin/keys', requireAdmin, (req, res) => {
  const name = (req.body?.name ?? '').trim()
  const projectId = (req.body?.projectId ?? '').trim()
  const scopes: string[] = Array.isArray(req.body?.scopes) ? req.body.scopes : []
  if (!name) { res.status(400).json({ error: 'name is required' }); return }
  if (!projectId) { res.status(400).json({ error: 'projectId is required' }); return }
  const { rawKey } = createApiKey(projectId, name, scopes)
  res.status(201).json({ key: rawKey, projectId, name, scopes })
})

router.delete('/admin/keys/:key', requireAdmin, (req, res) => {
  revokeApiKey(req.params.key as string)
  res.json({ ok: true })
})

router.get('/admin/audit', requireAdmin, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  res.json(getAuditLog(limit))
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
