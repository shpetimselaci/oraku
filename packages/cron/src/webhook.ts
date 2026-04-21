import { createHmac } from 'crypto'

type DueNotification = { id: string; expires_at: string | null }

function sign(secret: string, payload: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
}

function filterExpired(notifications: DueNotification[]): DueNotification[] {
  const now = new Date()
  return notifications.filter(n => !n.expires_at || new Date(n.expires_at) > now)
}

export async function deliver(
  notifications: DueNotification[],
  webhookUrl: string,
  webhookSecret: string | null,
  apiUrl: string
): Promise<void> {
  const active = filterExpired(notifications)
  if (!active.length) {
    console.warn(`[cron] All notifications expired before delivery — skipping`)
    return
  }

  const body = JSON.stringify({ notifications: active })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (webhookSecret) headers['X-Oraku-Signature'] = sign(webhookSecret, body)

  const res = await fetch(webhookUrl, { method: 'POST', headers, body })

  if (!res.ok) {
    console.warn(`[cron] Delivery failed (${res.status}) — will retry next tick`)
    return
  }

  const ids = active.map(n => n.id)
  await fetch(`${apiUrl}/notifications/delivered`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })

  console.log(`[cron] Delivered and marked ${ids.length} notification(s)`)
}
