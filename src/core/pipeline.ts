import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notifications'
import type { Event, Finding } from '../types'

export interface PipelineOptions {
  groupBy?: string | string[]
  apiKey?: string
}

export interface PipelineResult {
  count: number
  findings: Finding[]
  notifications: string[]
  notificationsByUser: Record<string, string[]>
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  const { groupBy = 'meta.userId' } = options

  const groups = new EventStitcher(events).stitchByField(groupBy)
  const findings = await new DetectorManager().runDetectorsOn(groups)

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

  // generate notifications per user so each user only gets their own
  const notificationsByUser: Record<string, string[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    const notifiable = userFindings.filter(f => !String(f.id).startsWith('summary-'))
    if (notifiable.length === 0) continue
    const raw = await generateNotifications(notifiable, { apiKey })
    notificationsByUser[userId] = raw
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
  }

  const notifications = Object.values(notificationsByUser).flat()

  return { count: findings.length, findings, notifications, notificationsByUser }
}
