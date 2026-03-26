import type { Detector, EventGroup, Finding, NotificationType, BuilderEntry, MarkerPredicate } from '../types'
import { parseMarker } from './helpers/markerParser'

export class DetectorBuilder {
  private entries: BuilderEntry[]
  private globalMarkers: MarkerPredicate[]

  constructor(detector: Detector) {
    this.entries = [{ detector, markers: [] }]
    this.globalMarkers = []
  }

  private static _from(entries: BuilderEntry[], globalMarkers: MarkerPredicate[]): DetectorBuilder {
    const b = Object.create(DetectorBuilder.prototype) as DetectorBuilder
    b.entries = entries
    b.globalMarkers = globalMarkers
    return b
  }

  // filters which events this detector sees — supports `or`, `and`, `not`, parentheses
  addMarker(expression: string): this {
    const pred = parseMarker(expression)
    if (this.entries.length === 1) {
      this.entries[0].markers.push(pred)
    } else {
      this.globalMarkers.push(pred)
    }
    return this
  }

  // merges two builders — each runs on its own markers, findings are combined
  compose(other: DetectorBuilder): DetectorBuilder {
    return DetectorBuilder._from(
      [...this.entries, ...other.entries],
      [...this.globalMarkers, ...other.globalMarkers]
    )
  }

  // independent copy — mutations don't affect the original
  clone(): DetectorBuilder {
    return DetectorBuilder._from(
      this.entries.map(e => ({ detector: e.detector, markers: [...e.markers] })),
      [...this.globalMarkers]
    )
  }

  build(): Detector {
    return new BuiltDetector(
      this.entries.map(e => ({ detector: e.detector, markers: [...e.markers] })),
      [...this.globalMarkers]
    )
  }
}

class BuiltDetector implements Detector {
  readonly name: string
  readonly description: string
  readonly notificationType: NotificationType

  constructor(
    private readonly entries: BuilderEntry[],
    private readonly globalMarkers: MarkerPredicate[]
  ) {
    this.name = entries.length === 1
      ? entries[0].detector.name
      : entries.map(e => e.detector.name).join('+')
    this.description = entries.map(e => e.detector.description).filter(Boolean).join(' | ')
    this.notificationType = entries[0]?.detector.notificationType ?? 'insight'
  }

  async detect(group: EventGroup): Promise<Finding[]> {
    const findings: Finding[] = []

    for (const entry of this.entries) {
      const allMarkers = [...this.globalMarkers, ...entry.markers]
      const filteredEvents = allMarkers.length
        ? group.events.filter(e => allMarkers.every(m => m(e)))
        : group.events

      if (!filteredEvents.length) continue

      const filteredGroup: EventGroup = { ...group, events: filteredEvents, count: filteredEvents.length }
      findings.push(...await entry.detector.detect(filteredGroup))
    }

    return findings
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of this.entries) {
      if (entry.detector.finalize) findings.push(...await entry.detector.finalize())
    }
    return findings
  }
}
