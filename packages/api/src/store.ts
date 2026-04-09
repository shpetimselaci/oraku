import type { Event, PipelineResult, SDKDetectorSchema } from '@oraku/brain'
import {
  getAllProjectDetectors,
  getAllProjectSettings,
  setProjectDetectors,
  setProjectSettings,
  type ProjectSettings
} from '@oraku/brain'
import type { ProjectStore } from './scheduler'

export const store: ProjectStore = {
  results:        new Map<string, PipelineResult>(),
  runTimestamps:  new Map<string, string>(),
  userTimestamps: new Map<string, Map<string, string>>(),
  events:         new Map<string, Event[]>(),
  detectors:      getAllProjectDetectors(),
  settings:       getAllProjectSettings(),
}

export function saveDetectors(apiKey: string, detectors: SDKDetectorSchema[]): void {
  store.detectors.set(apiKey, detectors)
  setProjectDetectors(apiKey, detectors)
}

export function saveSettings(apiKey: string, settings: ProjectSettings): void {
  store.settings.set(apiKey, settings)
  setProjectSettings(apiKey, settings)
}
