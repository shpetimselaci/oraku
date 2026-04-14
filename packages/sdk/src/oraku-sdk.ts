import type { ActivityEvent, ProjectSettings, ProjectCron, OrakuConfig } from './types'
import { DetectorBuilder } from './detector-builder'
import { Pipeline } from './pipeline'
import { ApiClient } from './api-client'

export class OrakuSDK {
  private client: ApiClient

  project: {
    setSettings: (settings: ProjectSettings) => Promise<void>
    setCron: (cron: ProjectCron) => Promise<void>
  }

  detectors: {
    add: (builder: DetectorBuilder) => Promise<void>
    remove: (name: string) => Promise<void>
  }

  constructor(config: OrakuConfig) {
    this.client = new ApiClient(config.apiUrl, config.apiKey)

    this.project = {
      setSettings: (settings) => this.client.setSettings(settings),
      setCron: (cron) => this.client.setCron(cron)
    }

    this.detectors = {
      add: (builder) => this.client.addDetector(builder),
      remove: (name) => this.client.removeDetector(name)
    }

    if (config.notificationsPerUser !== undefined) {
      this.client.setSettings({ notificationsPerUser: config.notificationsPerUser }).catch(() => {})
    }
  }

  consume(input: ActivityEvent[] | string): Pipeline {
    return new Pipeline(this.client.url, this.client.headers()).consume(input)
  }
}
