export async function deliver(
  notifications: Array<{ id: string }>,
  webhookUrl: string,
  apiUrl: string,
  attempt = 1
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifications })
  })

  if (!res.ok) {
    if (attempt < 3) {
      console.warn(`[cron] Delivery failed (attempt ${attempt}) — retrying in 5s`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      return deliver(notifications, webhookUrl, apiUrl, attempt + 1)
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
