import { createHmac } from 'crypto'

export type Notification = { ref: string; detector: string; type: string; message: string; scheduledAt?: string; permanent?: boolean }

function sign(secret: string, payload: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
}

export async function deliver(
  notifications: Notification[],
  webhookUrl: string,
  webhookSecret: string | null
): Promise<void> {
  const body = JSON.stringify({ notifications })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (webhookSecret) headers['X-Oraku-Signature'] = sign(webhookSecret, body)

  const res = await fetch(webhookUrl, { method: 'POST', headers, body })

  if (!res.ok) {
    console.warn(`[cron] Delivery failed (${res.status}) — will retry next tick`)
    return
  }

  console.log(`[cron] Delivered ${notifications.length} notification(s)`)
}
