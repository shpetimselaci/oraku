import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notifications'
import { initSchema } from '../db/schema'
import { saveFindings, getFindings } from '../db/findings'
import { saveNotifications } from '../db/notifications'
import type { Event, Finding, Severity, SerializableDetectorConfig } from '../types'

export interface PipelineOptions {
  groupBy?: string | string[]
  apiKey?: string
  detectorConfigs?: SerializableDetectorConfig[]
  forUserId?: string // if set, only generate notifications for this user
  webhookUrl?: string
  webhookAuthKey?: string
}

export interface PipelineResult {
  count: number
  findings: Finding[]
  notifications: string[]
  notificationsByUser: Record<string, string[]>
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  initSchema()
  const { groupBy = 'meta.userId' } = options

  const groups = new EventStitcher(events).stitchByField(groupBy)
  const findings = await new DetectorManager({ detectorConfigs: options.detectorConfigs }).runDetectorsOn(groups)

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set in oraku-main environment')

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
  // if forUserId is set, skip all other users (avoids unnecessary Groq calls)
  const notificationsByUser: Record<string, string[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    if (options.forUserId && userId !== options.forUserId) continue

    // fetch findings from DB so notifications are driven by persisted data
    const dbFindings = await getFindings(userId)
    const notifiable = dbFindings
      .filter(f => !String(f.id).startsWith('summary-'))
      .map(f => ({ ...f, severity: f.severity as Severity, evidence: f.evidence ?? {}, groupKey: userId }))

    if (notifiable.length === 0) continue
    const raw = await generateNotifications(notifiable, { apiKey })
    const messages = raw
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)

    notificationsByUser[userId] = messages

    // save notifications and link them to the findings that produced them
    await saveNotifications(userId, messages, dbIdsByUser[userId] ?? [])
  }

  const notifications = Object.values(notificationsByUser).flat()

  if (options.webhookUrl && notifications.length) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (options.webhookAuthKey) headers['Authorization'] = `Bearer ${options.webhookAuthKey}`
    try {
      const res = await fetch(options.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notifications, notificationsByUser, count: findings.length })
      })
      if (!res.ok) console.error(`[webhook] POST failed: ${res.status} ${options.webhookUrl}`)
      else console.log(`[webhook] Delivered ${notifications.length} notifications to ${options.webhookUrl}`)
    } catch (err) {
      console.error(`[webhook] Error:`, (err as Error).message)
    }
  }

  return { count: findings.length, findings, notifications, notificationsByUser }
}
