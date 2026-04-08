import type { Event, PipelineResult, SDKDetectorSchema } from '../../oraku-main/src/types'
import type { ProjectStore } from './scheduler'

export const store: ProjectStore = {
  results:        new Map<string, PipelineResult>(),
  runTimestamps:  new Map<string, string>(),
  userTimestamps: new Map<string, Map<string, string>>(),
  events:         new Map<string, Event[]>(),
  detectors:      new Map<string, SDKDetectorSchema[]>(),
  settings:       new Map(),
}
