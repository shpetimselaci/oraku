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
  detectors:      new Map<string, SDKDetectorSchema[]>(),
  settings:       new Map<string, ProjectSettings>(),
}

export function initStore(): void {
  for (const [k, v] of getAllProjectDetectors()) store.detectors.set(k, v)
  for (const [k, v] of getAllProjectSettings()) store.settings.set(k, v)
}

export function saveDetectors(apiKey: string, detectors: SDKDetectorSchema[]): void {
  store.detectors.set(apiKey, detectors)
  setProjectDetectors(apiKey, detectors)
}

export function saveSettings(apiKey: string, settings: ProjectSettings): void {
  store.settings.set(apiKey, settings)
  setProjectSettings(apiKey, settings)
}
