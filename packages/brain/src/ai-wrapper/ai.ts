import { ChatProvider } from '../providers/chat-provider'
import { AIChain } from './ai-chain'
import type { LLMProvider, Finding } from '../types'

export class AI {
  private readonly provider: LLMProvider

  constructor(provider?: LLMProvider) {
    this.provider = provider ?? new ChatProvider()
  }

  consume(findings: Finding[]): AIChain {
    return new AIChain(this.provider, findings)
  }

  complete(userContent: string, systemPrompt?: string): Promise<string> {
    return this.provider.complete(userContent, systemPrompt)
  }
}
