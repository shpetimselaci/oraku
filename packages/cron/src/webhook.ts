import { createHmac } from 'crypto'

function sign(secret: string, payload: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
}

export async function deliver(
  notifications: Array<{ id: string }>,
  webhookUrl: string,
  webhookSecret: string | null,
  apiUrl: string,
  attempt = 1
): Promise<void> {
  const body = JSON.stringify({ notifications })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (webhookSecret) headers['X-Oraku-Signature'] = sign(webhookSecret, body)

  const res = await fetch(webhookUrl, { method: 'POST', headers, body })

  if (!res.ok) {
    if (attempt < 3) {
      console.warn(`[cron] Delivery failed (attempt ${attempt}) — retrying in 5s`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      return deliver(notifications, webhookUrl, webhookSecret, apiUrl, attempt + 1)
    }
    console.error(`[cron] Delivery failed after 3 attempts — will retry next tick`)
    return
  }

  const ids = notifications.map(n => n.id)
  await fetch(`${apiUrl}/notifications/delivered`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })

  console.log(`[cron] Delivered and marked ${ids.length} notification(s)`)
}
