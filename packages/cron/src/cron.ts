import cron from 'node-cron'
import { deliver } from './webhook'

type DueProject = { projectId: string; webhookUrl: string | null; notifications: Array<{ id: string }> }

export function startCron(apiUrl: string, _webhookUrl: string, expression: string) {
  async function pollAndDeliver() {
    const dueRes = await fetch(`${apiUrl}/notifications/due`)
    if (!dueRes.ok) {
      console.error(`[cron] Failed to fetch due notifications: ${dueRes.status}`)
      return
    }

    const { projects } = await dueRes.json() as { projects: DueProject[] }
    if (!projects?.length) return

    for (const project of projects) {
      if (!project.notifications.length) continue
      if (!project.webhookUrl) {
        console.log(`[cron] No webhook configured for project ${project.projectId} — skipping`)
        continue
      }
      console.log(`[cron] Delivering ${project.notifications.length} notification(s) to project ${project.projectId}`)
      await deliver(project.notifications, project.webhookUrl, apiUrl)
    }
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
