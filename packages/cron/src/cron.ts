import cron from 'node-cron'
import { deliver } from './webhook'

export function startCron(apiUrl: string, webhookUrl: string, expression: string) {
  async function pollAndDeliver() {
    const dueRes = await fetch(`${apiUrl}/notifications/due`)
    if (!dueRes.ok) {
      console.error(`[cron] Failed to fetch due notifications: ${dueRes.status}`)
      return
    }

    const { notifications } = await dueRes.json() as { notifications: Array<{ id: string }> }
    if (!notifications.length) return

    console.log(`[cron] ${notifications.length} due notification(s)`)

    if (!webhookUrl) {
      console.log('[cron] No DELIVERY_WEBHOOK_URL set — skipping delivery')
      return
    }

    await deliver(notifications, webhookUrl, apiUrl)
  }

  cron.schedule(expression, async () => {
    try {
      await pollAndDeliver()
    } catch (err) {
      console.error('[cron] Error:', (err as Error).message)
    }
  })

  console.log(`[cron] Oraku cron started — polling on schedule: ${expression}`)
}
