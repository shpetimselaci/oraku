import type { ActivityEvent, GenerateOptions, Notification } from './types'

export class Pipeline {
  private sources: Array<{ events?: ActivityEvent[]; url?: string }> = []

  constructor(
    private readonly apiUrl: string,
    private readonly headers: Record<string, string>
  ) {}

  consume(input: ActivityEvent[] | string): this {
    if (typeof input === 'string') this.sources.push({ url: input })
    else this.sources.push({ events: input })
    return this
  }

  async generate(options: GenerateOptions = {}): Promise<Notification[]> {
    const ingestRes = await fetch(`${this.apiUrl}/ingest`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sources: this.sources })
    })
    if (!ingestRes.ok) throw new Error(`ingest failed: ${ingestRes.status}`)

    const params = new URLSearchParams()
    if (options.externalRef) params.set('externalRef', options.externalRef)
    if (options.limit) params.set('limit', String(options.limit))

    const notifRes = await fetch(`${this.apiUrl}/notifications?${params.toString()}`, {
      headers: this.headers
    })
    if (!notifRes.ok) throw new Error(`notifications failed: ${notifRes.status}`)

    const data = await notifRes.json() as { notifications: Notification[] }
    return data.notifications
  }
}
