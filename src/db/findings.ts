import { createHash, randomUUID } from 'crypto'
import { db } from './connection'
import type { Finding, NotificationType } from '../types'

// generates a deterministic UUID from any string so the same userId always maps to the same UUID
export function toUUID(str: string): string {
  const hash = createHash('sha256').update(str).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32)
  ].join('-')
}

export interface DbFinding {
  id: string
  user_id: string
  detector: string
  notification_type: NotificationType
  message: string
  evidence: Record<string, unknown>
  detected_at: string
}

const insertFinding = db.prepare(`
  INSERT INTO findings (id, user_id, detector, notification_type, message, evidence)
  VALUES (@id, @user_id, @detector, @notification_type, @message, @evidence)
`)

const selectFindings = db.prepare(`
  SELECT * FROM findings
  WHERE user_id = ?
  ORDER BY detected_at DESC
`)

export function saveFindings(findings: Finding[]): DbFinding[] {
  if (!findings.length) return []

  const saved: DbFinding[] = []

  const insertMany = db.transaction((rows: Finding[]) => {
    for (const f of rows) {
      const id = randomUUID()
      const rawKey = f.groupKey as string | undefined
      if (!rawKey) continue
      const user_id = toUUID(rawKey)
      insertFinding.run({
        id,
        user_id,
        detector: f.detector,
        notification_type: f.notificationType,
        message: f.message,
        evidence: JSON.stringify(f.evidence)
      })
      saved.push({
        id,
        user_id,
        detector: f.detector,
        notification_type: f.notificationType,
        message: f.message,
        evidence: f.evidence,
        detected_at: new Date().toISOString()
      })
    }
  })

  insertMany(findings)
  return saved
}

export function getFindings(userId: string): DbFinding[] {
  const rows = selectFindings.all(toUUID(userId)) as any[]
  return rows.map(r => ({
    ...r,
    evidence: JSON.parse(r.evidence ?? '{}')
  }))
}
