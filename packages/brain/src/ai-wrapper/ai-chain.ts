import { generateNotifications } from '../core/notification-generator'
import type { LLMProvider, Finding, Notification } from '../types'

type GenerateOptions = { subjectMap?: Record<string, string> }

export class AIChain {
  constructor(
    private readonly provider: LLMProvider,
    private readonly findings: Finding[]
  ) {}

  generateNotifications(options: GenerateOptions = {}): Promise<Record<string, Notification[]>> {
    return generateNotifications(this.findings, { provider: this.provider, ...options })
  }
}
