import { randomUUID } from 'crypto'
import { db } from './connection'
import { toUUID } from './findings'

export interface DbNotification {
  id: string
  user_id: string
  message: string
  created_at: string
}

const insertNotification = db.prepare(`
  INSERT INTO notifications (id, user_id, message)
  VALUES (@id, @user_id, @message)
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
      insertNotification.run({ id, user_id, message })
      saved.push({ id, user_id, message, created_at: new Date().toISOString() })
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
