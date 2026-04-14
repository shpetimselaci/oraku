import type { ActivityEvent, GenerateOptions, ProjectSettings, ProjectCron, OrakuConfig, DetectorApiConfig, DetectorExtractConfig, Notification, NotificationType } from './types'
import { DetectorBuilder } from './detector-builder'
import { Pipeline } from './pipeline'

export class OrakuSDK {
  private apiUrl: string
  private apiKey: string

  project: {
    setSettings: (settings: ProjectSettings) => Promise<void>
    setCron: (cron: ProjectCron) => Promise<void>
  }

  detectors: {
    add: (builder: DetectorBuilder) => Promise<void>
    remove: (name: string) => Promise<void>
  }

  constructor(config: OrakuConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey

    this.project = {
      setSettings: (settings) => this.setSettings(settings),
      setCron: (cron) => this.setCron(cron)
    }

    this.detectors = {
      add: (builder) => this.addDetector(builder),
      remove: (name) => this.removeDetector(name)
    }

    if (config.notificationsPerUser !== undefined) {
      this.setSettings({ notificationsPerUser: config.notificationsPerUser }).catch(() => {})
    }
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'x-api-key': this.apiKey }
  }

  consume(input: ActivityEvent[] | string): Pipeline {
    return new Pipeline(this.apiUrl, this.headers()).consume(input)
  }

  private async setSettings(settings: ProjectSettings): Promise<void> {
    const res = await fetch(`${this.apiUrl}/project/settings`, { method: 'POST', headers: this.headers(), body: JSON.stringify(settings) })
    if (!res.ok) throw new Error(`setSettings failed: ${res.status}`)
  }

  private async setCron(cron: ProjectCron): Promise<void> {
    const res = await fetch(`${this.apiUrl}/project/cron`, { method: 'POST', headers: this.headers(), body: JSON.stringify(cron) })
    if (!res.ok) throw new Error(`setCron failed: ${res.status}`)
  }

  private async addDetector(builder: DetectorBuilder): Promise<void> {
    const config = builder.toConfig()
    const res = await fetch(`${this.apiUrl}/detectors`, { method: 'POST', headers: this.headers(), body: JSON.stringify(config) })
    if (!res.ok) throw new Error(`detectors.add failed: ${res.status}`)
  }

  private async removeDetector(name: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/detectors/${encodeURIComponent(name)}`, { method: 'DELETE', headers: this.headers() })
    if (!res.ok) throw new Error(`detectors.remove failed: ${res.status}`)
  }
}

export default OrakuSDK
export { DetectorBuilder, Pipeline }
export type { ActivityEvent, GenerateOptions, ProjectSettings, ProjectCron, OrakuConfig, DetectorApiConfig, DetectorExtractConfig, Notification, NotificationType }
