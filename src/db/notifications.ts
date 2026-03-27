import { randomUUID } from 'crypto'
import { db } from './connection'
import { toUUID } from './findings'
import type { DbNotification } from '../types'

const insertNotification = db.prepare(`
  INSERT INTO notifications (id, user_id, message, generated_date)
  VALUES (@id, @user_id, @message, @generated_date)
`)

const insertLink = db.prepare(`
  INSERT INTO finding_notifications (notification_id, finding_id)
  VALUES (@notification_id, @finding_id)
`)

export function saveNotifications(
  userId: string,
  messages: string[],
  findingIds: string[]
): DbNotification[] {
  if (!messages.length) return []

  const saved: DbNotification[] = []

  const run = db.transaction(() => {
    for (const message of messages) {
      const id = randomUUID()
      const user_id = toUUID(userId)
      const generated_date = new Date().toISOString().slice(0, 10)
      insertNotification.run({ id, user_id, message, generated_date })
      saved.push({ id, user_id, message, generated_date, created_at: new Date().toISOString() })
    }

    // link each notification to all findings that produced it
    if (findingIds.length) {
      for (const n of saved) {
        for (const finding_id of findingIds) {
          insertLink.run({ notification_id: n.id, finding_id })
        }
      }
    }
  })

  run()
  return saved
}
