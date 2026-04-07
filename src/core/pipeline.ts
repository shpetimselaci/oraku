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
import { upsertProfile, getAllProfiles } from '../db/profiles'
import { OrgBenchmarkDetector } from '../detectors/OrgBenchmarkDetector'
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

  // update persisted user profiles from current event groups
  for (const group of Object.values(groups)) {
    upsertProfile(group)
  }

  // run org benchmark detector against all profiles
  const allProfiles = getAllProfiles()
  const benchmarkFindings = await new OrgBenchmarkDetector().detectAll(groups, allProfiles)
  const benchmarkByUser: Record<string, Finding[]> = {}
  for (const f of benchmarkFindings) {
    const uid = f.groupKey as string | undefined
    if (!uid) continue
    if (!benchmarkByUser[uid]) benchmarkByUser[uid] = []
    benchmarkByUser[uid].push(f)
  }

  const quota = options.notificationsPerUser ?? 1

  // generate notifications per user using in-memory findings directly
  const notificationsByUser: Record<string, Notification[]> = {}
  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    if (options.forUserId && userId !== options.forUserId) continue

    // collapse: one finding per detector per run
    const collapsed = new Map<string, Finding>()
    for (const f of userFindings) {
      if (!String(f.id).startsWith('summary-') && !collapsed.has(f.detector)) {
        collapsed.set(f.detector, f)
      }
    }
    let dedupedFindings = Array.from(collapsed.values())

    // fill with org benchmark findings up to quota
    if (dedupedFindings.length < quota) {
      for (const bf of (benchmarkByUser[userId] ?? [])) {
        if (dedupedFindings.length >= quota) break
        dedupedFindings.push(bf)
      }
    }

    // apply quota
    dedupedFindings = dedupedFindings.slice(0, quota)
    if (!dedupedFindings.length) continue

    const meta = (groups[userId]?.events[0]?.meta) as Record<string, unknown> | undefined
    const subject = (meta?.subject ?? meta?.childName) as string | undefined
    const notifications = await generateNotifications(dedupedFindings, { provider, subject })
    notificationsByUser[userId] = notifications
    await saveNotifications(userId, notifications)
  }

  const notifications = Object.values(notificationsByUser).flat()

  return { count: findings.length, findings, notifications, notificationsByUser }
}
