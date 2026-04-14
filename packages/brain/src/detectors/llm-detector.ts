import dayjs from 'dayjs'
import { BaseDetector } from './base-detector'
import { filterByDate, parseDate } from './helpers/date-utils'
import { AIRetryOnFail } from './helpers/ai-retry-on-fail'
import type { AI } from '../ai-wrapper/ai'
import type { EventGroup, Finding, LLMDetectorConfig, RawLLMFinding } from '../types'
import { NotificationTypes } from './helpers/notification-types'

const SYSTEM_PROMPT = `
You are a security and activity log analyst.
Analyze the provided logs and return a JSON array of findings.
Rules:
- Focus on patterns and gaps in the activity data.
- Return ONLY the JSON array.
- No conversational text or markdown blocks.
- If no issues are found, return [].
`

export class LLMDetector extends BaseDetector {
  private ai: AI
  private maxEvents: number

  private pendingEntries: Array<{ ref: string; events: Array<{ time: string | null; category: string; label: string | null }> }> = []

  constructor(config: LLMDetectorConfig) {
    super({ name: 'LLMDetector', notificationType: NotificationTypes.INSIGHT, ...config })
    this.ai = config.ai
    this.maxEvents = config.maxEvents ?? 30
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const raw = this.getEvents(entry)
    if (!raw.length) return []

    const todayEvents = filterByDate(raw, new Date(), 'day')
    const sourceEvents = todayEvents.length ? todayEvents : raw

    const events = sourceEvents
      .slice(0, this.maxEvents)
      .map(logEvent => {
        const d = parseDate(logEvent.createdAt)
        return {
          time: d ? dayjs(d).format('HH:mm:ss') : null,
          category: this.getString(logEvent, 'category') ?? 'log',
          label: this.getEventLabel(logEvent) ?? null
        }
      })

    if (events.length) this.pendingEntries.push({ ref: entry.externalRef ?? 'unknown', events })

    return []
  }

  async finalize(): Promise<Finding[]> {
    if (!this.pendingEntries.length) return []

    const queue = this.pendingEntries.splice(0)
    const allFindings: Finding[] = []

    for (let i = 0; i < queue.length; i++) {
      const { ref, events } = queue[i]
      try {
        const raw = await AIRetryOnFail<string>(
          () => this.ai.complete(
            JSON.stringify({ context: ref, events }),
            SYSTEM_PROMPT
          ),
          1,
          (err: unknown) => err instanceof Error && err.message.startsWith('429:')
        )

        const parsed = this.parseFindings(raw)
        for (const [j, f] of parsed.entries()) {
          allFindings.push(this.createFinding({
            id: `ai-${ref}-${j}-${Math.random().toString(36).slice(2, 5)}`,
            notificationType: NotificationTypes.INSIGHT,
            message: f.message,
            evidence: { category: f.category, analysis: f.evidence }
          }))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.startsWith('429:')) {
          console.warn(`[${this.name}] Rate limited on "${ref}" — skipping remaining entries.`)
          break
        }
        console.error(`[${this.name}] Failed on "${ref}":`, msg)
      }
    }

    return allFindings
  }

  private parseFindings(content: string): RawLLMFinding[] {
    try {
      const parsed = JSON.parse(content || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      console.warn(`[${this.name}] Failed to parse LLM response as JSON — skipping`)
      return []
    }
  }
}

export default LLMDetector
