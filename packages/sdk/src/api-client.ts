import type { ProjectSettings, ProjectCron } from './types'
import type { DetectorBuilder } from './detector-builder'

export class ApiClient {
  private apiUrl: string
  private apiKey: string

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'x-api-key': this.apiKey }
  }

  get url(): string {
    return this.apiUrl
  }

  async setSettings(settings: ProjectSettings): Promise<void> {
    const res = await fetch(`${this.apiUrl}/project/settings`, { method: 'POST', headers: this.headers(), body: JSON.stringify(settings) })
    if (!res.ok) throw new Error(`setSettings failed: ${res.status}`)
  }

  async setCron(cron: ProjectCron): Promise<void> {
    const res = await fetch(`${this.apiUrl}/project/cron`, { method: 'POST', headers: this.headers(), body: JSON.stringify(cron) })
    if (!res.ok) throw new Error(`setCron failed: ${res.status}`)
  }

  async addDetector(builder: DetectorBuilder): Promise<void> {
    const config = builder.toConfig()
    const res = await fetch(`${this.apiUrl}/detectors`, { method: 'POST', headers: this.headers(), body: JSON.stringify(config) })
    if (!res.ok) throw new Error(`detectors.add failed: ${res.status}`)
  }

  async removeDetector(name: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/detectors/${encodeURIComponent(name)}`, { method: 'DELETE', headers: this.headers() })
    if (!res.ok) throw new Error(`detectors.remove failed: ${res.status}`)
  }
}
