import type { Detector, EventGroup, Finding, Severity } from '../types'
import { parseMarker, type MarkerPredicate } from './helpers/markerParser'

// ─── Internal ─────────────────────────────────────────────────────────────────

interface BuilderEntry {
  detector: Detector
  markers: MarkerPredicate[]
}

// ─── DetectorBuilder ──────────────────────────────────────────────────────────

export class DetectorBuilder {
  private entries: BuilderEntry[]
  private globalMarkers: MarkerPredicate[]

  /**
   * Start a builder from a single detector (the detection logic).
   *
   * @example
   * new DetectorBuilder(new StreakDetector({ minRepeat: 3 }))
   *   .addMarker('meals or routine')
   *   .build()
   */
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

  /**
   * Add a marker expression that filters which events this detector sees.
   * Supports `or`, `and`, `not`, and parentheses.
   *
   * On a single-detector builder: applies to that detector.
   * On a composed builder: applies as a global filter across all inner detectors.
   *
   * @example
   * builder.addMarker('meals or routine')
   * builder.addMarker('not handwash')
   * builder.addMarker('(meals or routine) and not skipped')
   */
  addMarker(expression: string): this {
    const pred = parseMarker(expression)
    if (this.entries.length === 1) {
      this.entries[0].markers.push(pred)
    } else {
      this.globalMarkers.push(pred)
    }
    return this
  }

  /**
   * Merge two builders into one. The result runs both detectors (each
   * filtered by their own markers), then combines their findings.
   *
   * @example
   * const mealsStreak   = new DetectorBuilder(new StreakDetector({ minRepeat: 3 })).addMarker('meals')
   * const routineStreak = new DetectorBuilder(new StreakDetector({ minRepeat: 2 })).addMarker('routine')
   * const combined = mealsStreak.compose(routineStreak).build()
   */
  compose(other: DetectorBuilder): DetectorBuilder {
    return DetectorBuilder._from(
      [...this.entries, ...other.entries],
      [...this.globalMarkers, ...other.globalMarkers]
    )
  }

  /**
   * Create an independent copy of this builder.
   * Useful for branching without affecting the original.
   *
   * @example
   * const base    = new DetectorBuilder(new StreakDetector({ minRepeat: 3 })).addMarker('meals')
   * const variant = base.clone().addMarker('not breakfast').build()
   */
  clone(): DetectorBuilder {
    return DetectorBuilder._from(
      this.entries.map(e => ({ detector: e.detector, markers: [...e.markers] })),
      [...this.globalMarkers]
    )
  }

  /**
   * Produce the final Detector. The returned detector pre-filters events
   * through all markers before handing them to the inner detection logic.
   */
  build(): Detector {
    return new BuiltDetector(
      this.entries.map(e => ({ detector: e.detector, markers: [...e.markers] })),
      [...this.globalMarkers]
    )
  }
}

// ─── BuiltDetector ────────────────────────────────────────────────────────────

class BuiltDetector implements Detector {
  readonly name: string
  readonly description: string
  readonly dataSource: null = null
  readonly severity: Severity

  constructor(
    private readonly entries: BuilderEntry[],
    private readonly globalMarkers: MarkerPredicate[]
  ) {
    this.name = entries.length === 1
      ? entries[0].detector.name
      : entries.map(e => e.detector.name).join('+')
    this.description = entries.map(e => e.detector.description).filter(Boolean).join(' | ')
    this.severity = entries[0]?.detector.severity ?? 'info'
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
      const result = await entry.detector.detect(filteredGroup)
      findings.push(...result)
    }

    return findings
  }

  async finalize(): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of this.entries) {
      if (entry.detector.finalize) {
        const result = await entry.detector.finalize()
        findings.push(...result)
      }
    }
    return findings
  }
}
