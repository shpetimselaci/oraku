import { randomUUID, createHash } from 'crypto'

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
import { db } from '@oraku/brain'

export const ORG_SCOPES = ['ingest', 'notifications'] as const
export const ALL_SCOPES = ['ingest', 'notifications', 'detectors'] as const
export type OrgScope = typeof ALL_SCOPES[number]

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

export function createApiKey(projectId: string, name: string, scopes: string[]): { rawKey: string; keyHash: string } {
  const rawKey = `oraku_${randomUUID().replace(/-/g, '')}`
  const keyHash = hashKey(rawKey)
  db.prepare('INSERT INTO api_keys (key, project_id, name, scopes) VALUES (?, ?, ?, ?)').run(keyHash, projectId, name, JSON.stringify(scopes))
  return { rawKey, keyHash }
}

export function listApiKeys(): ApiKey[] {
  const rows = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as (Omit<ApiKey, 'scopes'> & { scopes: string })[]
  return rows.map(r => ({ ...r, scopes: JSON.parse(r.scopes) }))
}

export function revokeApiKey(key: string): void {
  db.prepare('UPDATE api_keys SET active = 0 WHERE key = ?').run(key)
}

export function validateApiKey(rawKey: string): { projectId: string; scopes: string[]; keyHash: string } | null {
  const keyHash = hashKey(rawKey)
  const row = db.prepare('SELECT active, scopes, project_id FROM api_keys WHERE key = ?').get(keyHash) as { active: number; scopes: string; project_id: string } | undefined
  if (!row || !row.active) return null
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = ?').run(keyHash)
  return { projectId: row.project_id, scopes: JSON.parse(row.scopes), keyHash }
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
