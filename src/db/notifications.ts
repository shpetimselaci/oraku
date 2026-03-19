import { supabase } from './connection'
import { toUUID } from './findings'

export interface DbNotification {
  id: string
  user_id: string
  message: string
  created_at: string
}

export async function saveNotifications(
  userId: string,
  messages: string[],
  findingIds: string[]
): Promise<DbNotification[]> {
  if (!messages.length) return []

  const rows = messages.map(message => ({
    user_id: toUUID(userId),
    message
  }))

  const { data, error } = await supabase
    .from('notifications')
    .insert(rows)
    .select()

  if (error) throw new Error(`Failed to save notifications: ${error.message}`)

  const notifications = data as DbNotification[]

  // link each notification to all findings that produced it
  if (findingIds.length) {
    const links = notifications.flatMap(n =>
      findingIds.map(finding_id => ({ notification_id: n.id, finding_id }))
    )

    const { error: linkError } = await supabase
      .from('finding_notifications')
      .insert(links)

    if (linkError) throw new Error(`Failed to save finding_notifications: ${linkError.message}`)
  }

  return notifications
}
