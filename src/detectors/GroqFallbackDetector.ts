import { BaseDetector } from './BaseDetector';
import type { EventGroup, Finding, LLMDetectorConfig, RawLLMFinding, GroqResponse } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `
You are a security and activity log analyst.
Analyze the provided logs and return a JSON array of findings.
Rules:
- Focus on patterns and gaps in the activity data.
- Return ONLY the JSON array.
- No conversational text or markdown blocks.
- If no issues are found, return [].
`;

export class GroqFallbackDetector extends BaseDetector {
  private apiKey?: string;
  private model: string;
  private maxEvents: number;
  private timeout: number;
  override isFallback = true;

  private pendingEntries: Array<{ ref: string; text: string }> = [];

  constructor(config: LLMDetectorConfig = {}) {
    super({ name: 'GroqFallbackDetector', notificationType: 'insight', ...config });

    this.apiKey = config.apiKey ?? process.env.GROQ_API_KEY;
    this.model = config.model ?? 'llama-3.1-8b-instant';
    this.maxEvents = config.maxEvents ?? 30;
    this.timeout = config.timeout ?? 15000;
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    if (!this.apiKey) {
      console.warn(`[${this.name}] Skipping: No API Key found.`);
      return [];
    }

    const events = this.getEvents(entry);
    if (!events.length) return [];

    const todayEvents = this.filterByDate(events, new Date(), 'day');
    const sourceEvents = todayEvents.length ? todayEvents : events;

    const eventText = sourceEvents
      .slice(0, this.maxEvents)
      .map(logEvent => {
        const d = this.parseDate(logEvent.createdAt)
        const time = d ? d.toISOString().slice(11, 19) : '--:--:--'
        return `${time} | ${this.getString(logEvent, 'category') ?? 'log'} | ${this.getEventLabel(logEvent) ?? ''}`
      })
      .join('\n');

    if (eventText) this.pendingEntries.push({ ref: entry.externalRef ?? 'unknown', text: eventText });

    return [];
  }

  async finalize(): Promise<Finding[]> {
    if (!this.pendingEntries.length) return [];

    const queue = this.pendingEntries.splice(0);
    const allFindings: Finding[] = [];

    for (let i = 0; i < queue.length; i++) {
      const { ref, text } = queue[i];
      try {
        const results = await this.callGroqWithRetry(text, ref, 1);
        for (const [j, f] of results.entries()) {
          allFindings.push(this.createFinding({
            id: `ai-${ref}-${j}-${Math.random().toString(36).slice(2, 5)}`,
            notificationType: 'insight',
            message: f.message,
            evidence: { category: f.category, analysis: f.evidence, llm_model: this.model }
          }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith('429:')) {
          console.warn(`[${this.name}] Rate limited on "${ref}" — skipping remaining entries.`);
          break;
        }
        console.error(`[${this.name}] Failed on "${ref}":`, msg);
      }

      if (i < queue.length - 1) await new Promise(res => setTimeout(res, 1000));
    }

    return allFindings;
  }

  private async callGroqWithRetry(text: string, ref: string | undefined, retries: number): Promise<RawLLMFinding[]> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.callGroqAPI(text, ref);
      } catch (err) {
        const is429 = err instanceof Error && err.message.startsWith('429:');
        if (is429 || i === retries) throw err;
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 500));
      }
    }
    return [];
  }

  private async callGroqAPI(eventText: string, context?: string): Promise<RawLLMFinding[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Analyze context "${context ?? 'unknown'}":\n${eventText}` }
          ],
          temperature: 0.1,
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        const detail = body?.error?.message ?? res.statusText
        console.warn(`[${this.name}] Groq ${res.status} — ${detail}`)
        throw new Error(`${res.status}: ${detail}`)
      }

      const data = (await res.json()) as GroqResponse;
      const content = data.choices?.[0]?.message?.content?.trim() || '[]';

      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      const cleaned = jsonMatch ? jsonMatch[0] : content;

      try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        console.warn(`[${this.name}] Failed to parse response as JSON — skipping`);
        return [];
      }

    } finally {
      clearTimeout(timeoutId);
    }
  }

}

export default GroqFallbackDetector;
