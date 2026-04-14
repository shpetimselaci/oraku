import { ChatProvider } from './providers/chat-provider'
import { generateNotifications } from './notification-generator'
import type { LLMProvider, Finding, Notification } from './types'

type GenerateOptions = { subjectMap?: Record<string, string> }

class AIChain {
  constructor(
    private readonly provider: LLMProvider,
    private readonly findings: Finding[]
  ) {}

  generateNotifications(options: GenerateOptions = {}): Promise<Record<string, Notification[]>> {
    return generateNotifications(this.findings, { provider: this.provider, ...options })
  }
}

export class AI {
  private readonly provider: LLMProvider

  constructor(provider?: LLMProvider) {
    this.provider = provider ?? new ChatProvider()
  }

  consume(findings: Finding[]): AIChain {
    return new AIChain(this.provider, findings)
  }

  // used internally by detectors that call the LLM directly
  complete(userContent: string, systemPrompt?: string): Promise<string> {
    return this.provider.complete(userContent, systemPrompt)
  }
}
