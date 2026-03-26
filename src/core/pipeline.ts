import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notificationGenerator'
import { initSchema } from '../db/schema'
import { saveFindings, getFindings } from '../db/findings'
import { saveNotifications } from '../db/notifications'
import type { Event, Finding, NotificationType } from '../types'
import type { DetectorBuilder } from '../detectors/DetectorBuilder'

export interface PipelineOptions {
  groupBy?: string | string[]
  apiKey?: string
  builders?: DetectorBuilder[]
  forUserId?: string
  webhookUrl?: string
  webhookAuthKey?: string
}

export interface PipelineResult {
  count: number
  findings: Finding[]
  notifications: string[]
  notificationsByUser: Record<string, string[]>
  webhookDelivered?: boolean
}

const TIMESTAMP_FIELDS = ['createdAt', 'created_at', 'timestamp', 'date', 'eventTime', 'event_time', 'occurredAt', 'occurred_at', 'time']
const DEFAULT_GROUP_BY = ['userId', 'user_id', 'uid', 'meta.userId', 'meta.user_id', 'meta.uid', 'meta.externalRef', 'meta.external_ref', 'externalRef', 'external_ref']

function normalizeEvent(raw: Record<string, unknown>): Event {
  if (typeof raw.createdAt === 'string' && raw.createdAt) return raw as Event
  for (const field of TIMESTAMP_FIELDS) {
    const val = raw[field]
    if (typeof val === 'string' && val) return { ...raw, createdAt: val } as Event
  }
  return { ...raw, createdAt: '' } as Event
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  initSchema()
  const { groupBy = DEFAULT_GROUP_BY } = options

  const normalized = (events as Record<string, unknown>[]).map(normalizeEvent)
  const groups = new EventStitcher(normalized).stitchByField(groupBy)
  const findings = await new DetectorManager({ builders: options.builders }).runDetectorsOn(groups)

  const apiKey = process.env.GROQ_API_KEY

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
      .map(f => ({ ...f, notificationType: f.notification_type as NotificationType, evidence: f.evidence ?? {}, groupKey: userId }))

    if (notifiable.length === 0) continue
    if (!apiKey) throw new Error('GROQ_API_KEY is required to generate notifications')
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
