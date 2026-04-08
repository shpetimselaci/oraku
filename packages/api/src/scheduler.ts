import { toBuilder } from '@oraku/brain/src/detectors/helpers/toBuilder'
import type { Finding, PipelineResult, SDKDetectorSchema, Event } from '@oraku/brain/src/types'

export type { SDKDetectorSchema }

export type ProjectSettings = {
  notificationsPerUser?: number
  webhookUrl?: string
  webhookAuthKey?: string
}

export type ProjectStore = {
  results:        Map<string, PipelineResult>
  runTimestamps:  Map<string, string>
  userTimestamps: Map<string, Map<string, string>>
  events:         Map<string, Event[]>
  detectors:      Map<string, SDKDetectorSchema[]>
  settings:       Map<string, ProjectSettings>
}

export function extractNextPredicted(findings: Finding[]): string | null {
  const now = Date.now()
  const times = findings
    .map(f => f.evidence?.predicted as string | undefined)
    .filter((p): p is string => !!p)
    .map(p => new Date(p).getTime())
    .filter(t => !isNaN(t) && t > now)
    .sort((a, b) => a - b)
  return times.length ? new Date(times[0]).toISOString() : null
}

export function toNextRun(predicted: string | null): string | null {
  return predicted ? new Date(new Date(predicted).getTime() - 30 * 60 * 1000).toISOString() : null
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

export { toBuilder }
