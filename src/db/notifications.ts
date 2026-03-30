import { createHash, randomUUID } from 'crypto'
import { db } from './connection'

function toUUID(str: string): string {
  const hash = createHash('sha256').update(str).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32)
  ].join('-')
}
import type { DbNotification, Notification } from '../types'

const insertNotification = db.prepare(`
  INSERT INTO notifications (id, user_id, message, type, scheduled_at, generated_date)
  VALUES (
    @id, @user_id, @message, @type,
    CASE @type
      WHEN 'reminder' THEN datetime('now', '-1 hour')
      WHEN 'warning'  THEN datetime('now', '+1 hour')
      WHEN 'insight'  THEN datetime(date('now'), '23:00:00')
      ELSE datetime('now')
    END,
    @generated_date
  )
`)

export function saveNotifications(
  userId: string,
  notifications: Notification[]
): DbNotification[] {
  if (!notifications.length) return []

  const saved: DbNotification[] = []

  const run = db.transaction(() => {
    for (const n of notifications) {
      const id = randomUUID()
      const user_id = toUUID(userId)
      const generated_date = new Date().toISOString().slice(0, 10)
      insertNotification.run({ id, user_id, message: n.message, type: n.type, generated_date })
      saved.push({ id, user_id, message: n.message, type: n.type, scheduled_at: '', generated_date, created_at: new Date().toISOString() })
    }
  })

  run()
  return saved
}
