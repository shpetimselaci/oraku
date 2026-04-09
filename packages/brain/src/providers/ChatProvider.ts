import type { ChatProviderConfig } from '../types'
import { LLMProvider } from './LLMProvider'

export class ChatProvider extends LLMProvider<{ apiKey: string; url: string; model: string }> {
  private timeout: number = 30000
  private parseResponse?: (data: any) => string

  constructor(config: ChatProviderConfig = {}) {
    super('ChatProvider', {
      apiKey: config.apiKey || process.env.LLM_API_KEY || '',
      url: config.url || process.env.LLM_URL || '',
      model: config.model || process.env.LLM_MODEL || 'gpt-3.5-turbo'
    })
    this.parseResponse = config.parseResponse
    this.timeout = config.timeout ?? 30000
  }

  setup(): void {}

  async complete<T>(userContent: string, systemPrompt?: string): Promise<T> {
    if (!this.config.apiKey) throw new Error('ChatProvider: no API key set')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const messages: { role: string; content: string }[] = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      messages.push({ role: 'user', content: userContent })

      const res = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: this.config.model, messages, temperature: 0.1 }),
        signal: controller.signal
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        const detail = body?.error?.message ?? res.statusText
        throw new Error(`${res.status}: ${detail}`)
      }

      const data = await res.json()
      const defaultParse = (d: any) => d.choices?.[0]?.message?.content?.trim() ?? ''
      return (this.parseResponse ?? defaultParse)(data) as unknown as T
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
