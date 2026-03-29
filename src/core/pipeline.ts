import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notificationGenerator'
import { ChatProvider } from '../providers/ChatProvider'
import { initSchema } from '../db/schema'
import { saveFindings, getFindings } from '../db/findings'
import { saveNotifications } from '../db/notifications'
import type { Event, Finding, Notification, NotificationType, PipelineOptions, PipelineResult } from '../types'


export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  initSchema()
  const groups = new EventStitcher(events).stitch()
  const findings = await new DetectorManager({ builders: options.builders }).runDetectorsOn(groups)

  // group findings by the userId tagged in DetectorManager, skipping untagged (finalize/global) findings
  const findingsByUser: Record<string, Finding[]> = {}
  for (const finding of findings) {
    const groupKey = finding.groupKey as string | undefined
    if (!groupKey) continue
    if (!findingsByUser[groupKey]) findingsByUser[groupKey] = []
    findingsByUser[groupKey].push(finding)
  }

  // save all findings to DB and collect their generated UUIDs per user
  const dbIdsByUser: Record<string, string[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    const saved = await saveFindings(userFindings)
    dbIdsByUser[userId] = saved.map(r => r.id)
  }

  // generate notifications per user so each user only gets their own
  // if forUserId is set, skip all other users (avoids unnecessary LLM calls)
  const notificationsByUser: Record<string, Notification[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    if (options.forUserId && userId !== options.forUserId) continue

    // fetch findings from DB so notifications are driven by persisted data
    const dbFindings = await getFindings(userId)
    const notifiable = dbFindings
      .filter(f => !String(f.id).startsWith('summary-'))
      .map(f => ({ ...f, notificationType: f.notification_type as NotificationType, evidence: f.evidence ?? {}, groupKey: userId, scheduledAt: new Date().toISOString() }))

    if (notifiable.length === 0) continue
    const notifications = await generateNotifications(notifiable, { provider: new ChatProvider({ baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL }) })

    notificationsByUser[userId] = notifications

    // save notifications and link them to the findings that produced them
    await saveNotifications(userId, notifications.map(n => n.message), dbIdsByUser[userId] ?? [])
  }

  const notifications = Object.values(notificationsByUser).flat()

  let webhookDelivered: boolean | undefined
  if (options.webhookUrl && notifications.length) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (options.webhookAuthKey) headers['Authorization'] = `Bearer ${options.webhookAuthKey}`
    try {
      const res = await fetch(options.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notifications, notificationsByUser, count: findings.length })
      })
      webhookDelivered = res.ok
      if (!res.ok) console.error(`[webhook] POST failed: ${res.status} ${options.webhookUrl}`)
    } catch (err) {
      webhookDelivered = false
      console.error(`[webhook] Error:`, (err as Error).message)
    }
  }

  return { count: findings.length, findings, notifications, notificationsByUser, webhookDelivered }
}
