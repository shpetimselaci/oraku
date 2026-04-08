import type { LLMProvider, ChatProviderConfig } from '../types'

export class ChatProvider implements LLMProvider {
  private baseUrl: string
  private apiKey: string
  readonly model: string
  private timeout: number

  constructor(config: ChatProviderConfig) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey ?? process.env.LLM_API_KEY ?? ''
    this.model = config.model ?? ''
    this.timeout = config.timeout ?? 15000
  }

  async complete(userContent: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) throw new Error('ChatProvider: no API key set')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const messages: { role: string; content: string }[] = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      messages.push({ role: 'user', content: userContent })

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.1 }),
        signal: controller.signal
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        const detail = body?.error?.message ?? res.statusText
        throw new Error(`${res.status}: ${detail}`)
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content?.trim() ?? ''
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
