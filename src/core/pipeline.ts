import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { EventStitcher } from './EventStitcher'
import { DetectorManager } from '../detectors/DetectorManager'
import { generateNotifications } from '../notifications'
import type { Event, Finding } from '../types'

export interface PipelineOptions {
  groupBy?: string | string[]
}

export interface PipelineResult {
  count: number
  findings: Finding[]
  notifications: string[]
}

export async function runPipeline(events: Event[], options: PipelineOptions = {}): Promise<PipelineResult> {
  const { groupBy = 'meta.userId' } = options

  const groups = new EventStitcher(events).stitchByField(groupBy)
  const findings = await new DetectorManager().runDetectorsOn(groups)

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set in oraku-main environment')

  const raw = await generateNotifications(findings, { apiKey })
  const notifications = raw
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  return { count: findings.length, findings, notifications }
}
