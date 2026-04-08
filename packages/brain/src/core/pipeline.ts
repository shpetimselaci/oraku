import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notificationGenerator'
import { ChatProvider } from '../providers/ChatProvider'
import type { LLMProvider } from '../types'
import { saveNotifications } from '../db/notifications'
import { upsertProfile, getAllProfiles } from '../db/profiles'
import { db } from '../db/connection'
import { OrgBenchmarkDetector } from '../detectors/OrgBenchmarkDetector'
import type { Event, Finding, Notification, PipelineOptions, PipelineResult } from '../types'


function resolveProvider(options: PipelineOptions): LLMProvider {
  if (!options.provider) {
    if (!process.env.LLM_BASE_URL) throw new Error('LLM_BASE_URL is not set')
    if (!process.env.LLM_MODEL) throw new Error('LLM_MODEL is not set')
  }
  return options.provider ?? new ChatProvider({ baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL ?? '' })
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  const provider = resolveProvider(options)
  const groups = new EventStitcher(events).stitch()
  const findings = await new DetectorManager({ builders: options.builders }).runDetectorsOn(groups)

  // findings without a groupKey are global/summary entries — skip them for per-user routing
  // forUserId filter applied here to avoid processing other users downstream
  const findingsByUser: Record<string, Finding[]> = {}
  for (const finding of findings) {
    const groupKey = finding.groupKey as string | undefined
    if (!groupKey) continue
    if (options.forUserId && groupKey !== options.forUserId) continue
    if (!findingsByUser[groupKey]) findingsByUser[groupKey] = []
    findingsByUser[groupKey].push(finding)
  }

  db.transaction(() => {
    for (const group of Object.values(groups)) {
      upsertProfile(group)
    }
  })()

  const allProfiles = getAllProfiles()
  const benchmarkFindings = await new OrgBenchmarkDetector().detectAll(groups, allProfiles)
  const benchmarkByUser: Record<string, Finding[]> = {}
  for (const benchmarkFinding of benchmarkFindings) {
    const userId = benchmarkFinding.groupKey as string | undefined
    if (!userId) continue
    if (!benchmarkByUser[userId]) benchmarkByUser[userId] = []
    benchmarkByUser[userId].push(benchmarkFinding)
  }

  const quota = options.notificationsPerUser ?? 1

  // accumulate findings from all users into one batch for a single LLM call
  const allFindings: Finding[] = []
  const subjectMap: Record<string, string> = {}

  for (const [userId, userFindings] of Object.entries(findingsByUser)) {
    // one finding per detector — prevents the same detector firing twice for the same user
    const collapsed = new Map<string, Finding>()
    for (const finding of userFindings) {
      if (!String(finding.id).startsWith('summary-') && !collapsed.has(finding.detector)) {
        collapsed.set(finding.detector, finding)
      }
    }
    let dedupedFindings = Array.from(collapsed.values())

    // backfill remaining quota slots with org benchmark findings
    if (dedupedFindings.length < quota) {
      for (const benchmarkFinding of (benchmarkByUser[userId] ?? [])) {
        if (dedupedFindings.length >= quota) break
        dedupedFindings.push(benchmarkFinding)
      }
    }

    dedupedFindings = dedupedFindings.slice(0, quota)
    if (!dedupedFindings.length) continue

    const meta = (groups[userId]?.events[0]?.meta) as Record<string, unknown> | undefined
    const subject = (meta?.subject ?? meta?.childName) as string | undefined
    if (subject) subjectMap[userId] = subject

    allFindings.push(...dedupedFindings)
  }

  const notificationsByUser: Record<string, Notification[]> = {}
  if (allFindings.length) {
    const generatedByUser = await generateNotifications(allFindings, { provider, subjectMap })
    await Promise.all(
      Object.entries(generatedByUser).map(async ([userId, notifications]) => {
        notificationsByUser[userId] = notifications
        await saveNotifications(userId, notifications)
      })
    )
  }

  const notifications = Object.values(notificationsByUser).flat()

  const actionableCount = findings.filter(f => !String(f.id).startsWith('summary-')).length
  return { count: actionableCount, findings, notifications, notificationsByUser }
}
