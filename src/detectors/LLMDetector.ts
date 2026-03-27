import { BaseDetector } from './BaseDetector'
import { AIRetryOnFail } from './helpers/AIRetryOnFail'
import type { EventGroup, Finding, LLMDetectorConfig, LLMProvider, RawLLMFinding } from '../types'

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
  private provider: LLMProvider
  private maxEvents: number
  override isFallback = true

  private pendingEntries: Array<{ ref: string; text: string }> = []

  constructor(config: LLMDetectorConfig) {
    super({ name: 'LLMDetector', notificationType: 'insight', ...config })
    this.provider = config.provider
    this.maxEvents = config.maxEvents ?? 30
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const events = this.getEvents(entry)
    if (!events.length) return []

    const todayEvents = this.filterByDate(events, new Date(), 'day')
    const sourceEvents = todayEvents.length ? todayEvents : events

    const eventText = sourceEvents
      .slice(0, this.maxEvents)
      .map(logEvent => {
        const d = this.parseDate(logEvent.createdAt)
        const time = d ? d.toISOString().slice(11, 19) : '--:--:--'
        return `${time} | ${this.getString(logEvent, 'category') ?? 'log'} | ${this.getEventLabel(logEvent) ?? ''}`
      })
      .join('\n')

    if (eventText) this.pendingEntries.push({ ref: entry.externalRef ?? 'unknown', text: eventText })

    return []
  }

  async finalize(): Promise<Finding[]> {
    if (!this.pendingEntries.length) return []

    const queue = this.pendingEntries.splice(0)
    const allFindings: Finding[] = []

    for (let i = 0; i < queue.length; i++) {
      const { ref, text } = queue[i]
      try {
        const raw = await AIRetryOnFail<string>(
          () => this.provider.complete(
            `Analyze context "${ref}":\n${text}`,
            SYSTEM_PROMPT
          ),
          1,
          (err: unknown) => err instanceof Error && err.message.startsWith('429:')
        )

        const parsed = this.parseFindings(raw)
        for (const [j, f] of parsed.entries()) {
          allFindings.push(this.createFinding({
            id: `ai-${ref}-${j}-${Math.random().toString(36).slice(2, 5)}`,
            notificationType: 'insight',
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

      if (i < queue.length - 1) await new Promise(res => setTimeout(res, 1000))
    }

    return allFindings
  }

  private parseFindings(content: string): RawLLMFinding[] {
    const jsonMatch = (content || '[]').match(/\[[\s\S]*?\]/)
    const cleaned = jsonMatch ? jsonMatch[0] : '[]'
    try {
      const parsed = JSON.parse(cleaned)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      console.warn(`[${this.name}] Failed to parse LLM response as JSON — skipping`)
      return []
    }
  }
}

export default LLMDetector
