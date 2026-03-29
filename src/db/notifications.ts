import { randomUUID } from 'crypto'
import { db } from './connection'
import { toUUID } from './findings'
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
