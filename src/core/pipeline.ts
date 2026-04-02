import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notificationGenerator'
import { ChatProvider } from '../providers/ChatProvider'
import type { LLMProvider } from '../types'
import { initSchema } from '../db/schema'
import { saveNotifications } from '../db/notifications'
import type { Event, Finding, Notification, PipelineOptions, PipelineResult } from '../types'


function resolveProvider(options: PipelineOptions): LLMProvider {
  if (!options.provider) {
    if (!process.env.LLM_BASE_URL) throw new Error('LLM_BASE_URL is not set')
    if (!process.env.LLM_MODEL) throw new Error('LLM_MODEL is not set')
  }
  return options.provider ?? new ChatProvider({ baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL })
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  initSchema()
  const provider = resolveProvider(options)
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

  // generate notifications per user using in-memory findings directly
  const notificationsByUser: Record<string, Notification[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    if (options.forUserId && userId !== options.forUserId) continue

    const notifiable = userFindings.filter(f => !String(f.id).startsWith('summary-'))
    if (!notifiable.length) continue

    const subject = groups[userId]?.events[0]?.meta?.subject as string | undefined
    const notifications = await generateNotifications(notifiable, { provider, subject })
    notificationsByUser[userId] = notifications
    await saveNotifications(userId, notifications)
  }

  const notifications = Object.values(notificationsByUser).flat()

  return { count: findings.length, findings, notifications, notificationsByUser }
}
