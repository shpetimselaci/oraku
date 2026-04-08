import { createHash, randomUUID } from 'crypto'
import { db } from './connection'

// deterministic UUID v4 derived from a string — same input always produces the same UUID.
// the & 0x3f clears the top 2 bits and | 0x80 sets the RFC 4122 variant bits on the clock_seq byte.
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

export function getDueNotifications(): DbNotification[] {
  return db.prepare(`
    SELECT * FROM notifications
    WHERE datetime(scheduled_at) <= datetime('now')
    AND delivered_at IS NULL
  `).all() as DbNotification[]
}

export function markDelivered(ids: string[]): void {
  if (!ids.length) return
  db.prepare(`UPDATE notifications SET delivered_at = datetime('now') WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids)
}

export function getDueNotificationsByUser(): Record<string, DbNotification[]> {
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE datetime(scheduled_at) <= datetime('now')
    AND delivered_at IS NULL
  `).all() as DbNotification[]

  const result: Record<string, DbNotification[]> = {}
  for (const row of rows) {
    const key = row.external_ref ?? row.user_id
    if (!result[key]) result[key] = []
    result[key].push(row)
  }
  return result
}

export function saveNotifications(
  userId: string,
  notifications: Notification[]
): DbNotification[] {
  if (!notifications.length) return []

  const insert = db.prepare(`
    INSERT OR IGNORE INTO notifications (id, user_id, external_ref, detector, message, type, scheduled_at, generated_date)
    VALUES (
      @id, @user_id, @external_ref, @detector, @message, @type,
      COALESCE(@scheduled_at, datetime('now')),
      @generated_date
    )
  `)

  const saved: DbNotification[] = []

  const checkPermanent = db.prepare(`SELECT 1 FROM notifications WHERE detector = ? AND external_ref = ? LIMIT 1`)

  db.transaction(() => {
    for (const notification of notifications) {
      if (notification.permanent && checkPermanent.get(notification.detector, userId)) continue

      const id = randomUUID()
      const user_id = toUUID(userId)
      const generated_date = new Date().toISOString().slice(0, 10)
      const scheduled_at = (notification as Notification & { scheduledAt?: string }).scheduledAt ?? null
      insert.run({ id, user_id, external_ref: userId, detector: notification.detector ?? null, message: notification.message, type: notification.type, scheduled_at, generated_date })
      saved.push({ id, user_id, external_ref: userId, detector: notification.detector, message: notification.message, type: notification.type, scheduled_at: scheduled_at ?? '', generated_date, created_at: new Date().toISOString(), delivered_at: null })
    }
  })()

  return saved
}
