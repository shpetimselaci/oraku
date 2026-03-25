import { BaseDetector } from './BaseDetector'
import { countPatterns, filterByPattern } from './helpers/EventCounter'
import type {
  Event,
  EventGroup,
  Finding,
  StreakConfig,
  StreakFrequency,
  StreakTrigger,
  TimestampedEvent
} from '../types'

export class StreakDetector extends BaseDetector {
  minRepeat: number
  triggerOn: StreakTrigger
  frequency: StreakFrequency
  private messageFormatter?: (pattern: string) => string

  constructor(config: StreakConfig) {
    super(config)
    this.minRepeat = config.minRepeat || 3
    this.triggerOn = config.triggerOn || 'ongoing'
    this.frequency = config.frequency ?? 'daily'
    this.messageFormatter = config.message
  }

  private advancePastWeekend(date: Date): Date {
    const d = new Date(date)
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
    return d
  }

  private isWeekend(date: Date): boolean {
    return date.getDay() === 0 || date.getDay() === 6
  }

  private predictNextDate(sortedEvents: TimestampedEvent[]): Date | null {
    if (sortedEvents.length < 2) return null

    const intervals: number[] = []
    for (let i = 1; i < sortedEvents.length; i++) {
      intervals.push(sortedEvents[i]._date.getTime() - sortedEvents[i - 1]._date.getTime())
    }
    intervals.sort((a, b) => a - b)

    const mid = Math.floor(intervals.length / 2)
    const median = intervals.length % 2
      ? intervals[mid]
      : (intervals[mid - 1] + intervals[mid]) / 2

    return new Date(sortedEvents[sortedEvents.length - 1]._date.getTime() + median)
  }

  private buildMessage(data: { category: string; subcategory: string; predictedDate: string }): string {
    if (this.messageFormatter) {
      return this.messageFormatter(`${data.category}/${data.subcategory}`).replace(
        '{{next}}',
        data.predictedDate?.split('T')[0] || 'soon'
      )
    }
    return this.triggerOn === 'break'
      ? `${data.category}/${data.subcategory} stopped unexpectedly`
      : `Predicted next ${data.category}/${data.subcategory}: ${data.predictedDate?.split('T')[0]}`
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const events = this.getEvents(entry)
    if (events.length < this.minRepeat) return []

    const counts = countPatterns(events)
    const now = new Date()
    const findings: Finding[] = []

    for (const [patternKey, count] of Object.entries(counts)) {
      if (count < this.minRepeat) continue

      const sorted: TimestampedEvent[] = filterByPattern(events, patternKey)
        .map((e) => {
          const d = this.parseDate(e.createdAt)
          return { ...e, _date: d ?? new Date(NaN) } as TimestampedEvent
        })
        .filter((e) => !isNaN(e._date.getTime()))
        .sort((a, b) => a._date.getTime() - b._date.getTime())

      if (sorted.length < this.minRepeat) continue

      let predicted = this.predictNextDate(sorted)
      if (!predicted) continue

      // For weekday-only streaks, push predicted date past any weekend
      if (this.frequency === 'weekdays') predicted = this.advancePastWeekend(predicted)

      const [category, subcategory] = patternKey.split('|')
      const messageData = { category, subcategory, predictedDate: predicted.toISOString() }
      const evidence = sorted.map((sortedEvent) => ({
        ref: this.getString(sortedEvent, 'externalRef'),
        date: sortedEvent.createdAt,
        log: this.getString(sortedEvent, 'log')
      }))
      const safeKey = patternKey.replace(/[^a-zA-Z0-9_-]/g, '_')

      if (this.triggerOn === 'ongoing' && predicted > now) {
        findings.push(this.createFinding({
          id: `recurring-${entry.externalRef}-${safeKey}`,
          message: this.buildMessage(messageData),
          evidence: { key: entry.externalRef, predicted: predicted.toISOString(), events: evidence, frequency: this.frequency, streakLength: sorted.length }
        }))
      }

      if (this.triggerOn === 'break' && predicted < now) {
        // For weekday-only streaks, don't fire a break on weekends
        if (this.frequency === 'weekdays' && this.isWeekend(now)) continue

        const hasEventAfterPredicted = sorted.some((e) => e._date > predicted!)
        if (!hasEventAfterPredicted) {
          findings.push(this.createFinding({
            id: `anomaly-${entry.externalRef}-${safeKey}`,
            severity: 'warning',
            message: this.buildMessage(messageData),
            evidence: { key: entry.externalRef, expected: predicted.toISOString(), events: evidence, frequency: this.frequency, streakLength: sorted.length }
          }))
        }
      }
    }

    return findings
  }
}

export default StreakDetector
