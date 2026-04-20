import dayjs from 'dayjs'
import { toBuilder, getDueNotificationsByUser } from '@oraku/brain'
import type { Finding, PipelineResult, SDKDetectorSchema, Event, ProjectSettings, Notification } from '@oraku/brain'

export type { SDKDetectorSchema, ProjectSettings }

export type ProjectStore = {
  results:        Map<string, PipelineResult>
  runTimestamps:  Map<string, string>
  userTimestamps: Map<string, Map<string, string>>
  events:         Map<string, Event[]>
  detectors:      Map<string, SDKDetectorSchema[]>
  settings:       Map<string, ProjectSettings>
}

export function extractNextPredicted(findings: Finding[]): string | null {
  const now = dayjs().valueOf()
  const times = findings
    .map(f => f.evidence?.predicted as string | undefined)
    .filter((p): p is string => !!p)
    .map(p => dayjs(p).valueOf())
    .filter(t => !isNaN(t) && t > now)
    .sort((a, b) => a - b)
  return times.length ? dayjs(times[0]).toISOString() : null
}

export function toNextRun(predicted: string | null): string | null {
  return predicted ? dayjs(predicted).subtract(30, 'minute').toISOString() : null
}

export function buildFindingMeta(findings: Finding[]) {
  const meta: Record<string, { type: 'streak' | 'anomaly'; predicted: string | null; lastEvent: string | null }[]> = {}
  for (const finding of findings) {
    const userId = finding.groupKey as string | undefined
    if (!userId) continue
    const type = String(finding.id).startsWith('anomaly-') ? 'anomaly' : 'streak'
    const predicted = (finding.evidence?.predicted ?? finding.evidence?.expected ?? null) as string | null
    const events = (finding.evidence?.events ?? []) as Array<{ date?: string }>
    const lastEvent = events.at(-1)?.date ?? null
    if (!meta[userId]) meta[userId] = []
    meta[userId].push({ type, predicted, lastEvent })
  }
  return meta
}

export function buildLatestPayload(projectId: string, store: ProjectStore) {
  const result = store.results.get(projectId)
  if (!result) return null

  const dueByUser = getDueNotificationsByUser()
  let latestCreatedAt: string | null = null
  const notificationsByUser: Record<string, Notification[]> = {}

  for (const [ref, dbNotifs] of Object.entries(dueByUser)) {
    notificationsByUser[ref] = dbNotifs.map(n => ({ ref, message: n.message, detector: n.detector ?? 'unknown', type: n.type, scheduledAt: n.scheduled_at }))
    for (const n of dbNotifs) if (!latestCreatedAt || n.created_at > latestCreatedAt) latestCreatedAt = n.created_at
  }

  const userGeneratedAt: Record<string, string> = {}
  store.userTimestamps.get(projectId)?.forEach((ts, uid) => { userGeneratedAt[uid] = ts })

  const nextPredicted = extractNextPredicted(result.findings)
  return {
    ok: true,
    notificationsByUser,
    findingMetaByUser: buildFindingMeta(result.findings),
    userGeneratedAt,
    nextRun: toNextRun(nextPredicted),
    runTimestamp: store.runTimestamps.get(projectId) ?? latestCreatedAt
  }
}

export { toBuilder }
