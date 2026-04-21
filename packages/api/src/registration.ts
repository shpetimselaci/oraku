import { randomUUID } from 'crypto'
import { Router } from 'express'
import { db } from '@oraku/brain/src/db/connection'

export type Registration = {
  id: string
  name: string
  webhook_url: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export function listRegistrations(): Registration[] {
  return db.prepare('SELECT * FROM registrations ORDER BY created_at DESC').all() as Registration[]
}

export function updateRegistrationStatus(id: string, status: 'approved' | 'rejected'): void {
  db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, id)
}

export function getRegistration(id: string): Registration | undefined {
  return db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as Registration | undefined
}

const router = Router()

router.post('/register', (req, res) => {
  const name = (req.body?.name ?? '').trim()
  const webhookUrl = (req.body?.webhookUrl ?? '').trim()
  if (!name) { res.status(400).json({ error: 'name is required' }); return }
  if (!webhookUrl) { res.status(400).json({ error: 'webhookUrl is required' }); return }

  const existing = db.prepare('SELECT id FROM registrations WHERE name = ? AND status = ?').get(name, 'pending')
  if (existing) { res.status(409).json({ error: 'A pending registration for this name already exists' }); return }

  const id = randomUUID()
  db.prepare('INSERT INTO registrations (id, name, webhook_url) VALUES (?, ?, ?)').run(id, name, webhookUrl)
  console.log(`[registration] New request from "${name}" — pending admin approval`)
  res.status(201).json({ ok: true, id, message: 'Registration submitted — awaiting admin approval' })
})

export default router
