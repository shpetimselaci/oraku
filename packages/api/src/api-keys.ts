import { randomUUID } from 'crypto'
import { db } from '@oraku/brain'

export type Project = {
  id: string
  name: string
  created_at: string
}

export type ApiKey = {
  key: string
  project_id: string
  name: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  active: number
}

export type AuditEntry = {
  id: string
  api_key: string
  method: string
  path: string
  status: number
  ip: string
  ts: string
}

export function createProject(name: string): Project {
  const id = `proj_${randomUUID().replace(/-/g, '')}`
  db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(id, name)
  return { id, name, created_at: new Date().toISOString() }
}

export function listProjects(): Project[] {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[]
}

export function createApiKey(projectId: string, name: string, scopes: string[]): string {
  const key = `oraku_${randomUUID().replace(/-/g, '')}`
  db.prepare('INSERT INTO api_keys (key, project_id, name, scopes) VALUES (?, ?, ?, ?)').run(key, projectId, name, JSON.stringify(scopes))
  return key
}

export function listApiKeys(): ApiKey[] {
  const rows = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as (Omit<ApiKey, 'scopes'> & { scopes: string })[]
  return rows.map(r => ({ ...r, scopes: JSON.parse(r.scopes) }))
}

export function revokeApiKey(key: string): void {
  db.prepare('UPDATE api_keys SET active = 0 WHERE key = ?').run(key)
}

export function validateApiKey(key: string): { projectId: string; scopes: string[] } | null {
  const row = db.prepare('SELECT active, scopes, project_id FROM api_keys WHERE key = ?').get(key) as { active: number; scopes: string; project_id: string } | undefined
  if (!row || !row.active) return null
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = ?').run(key)
  return { projectId: row.project_id, scopes: JSON.parse(row.scopes) }
}

export function logAudit(entry: Omit<AuditEntry, 'id' | 'ts'>): void {
  db.prepare(
    'INSERT INTO audit_log (id, api_key, method, path, status, ip) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), entry.api_key, entry.method, entry.path, entry.status, entry.ip)
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return db.prepare(
    'SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?'
  ).all(limit) as AuditEntry[]
}
