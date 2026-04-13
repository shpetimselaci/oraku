import { BaseDetector } from './BaseDetector'
import { minEvents } from '../filters/detectorConditions'
import { NotificationTypes } from './helpers/notificationTypes'
import type {
  Event,
  EventGroup,
  Finding,
  StreakConfig,
  StreakFrequency,
  StreakPrecision,
  StreakTrigger,
  TimestampedEvent
} from '../types'

export class StreakDetector extends BaseDetector {
  readonly conditions
  minRepeat: number
  triggerOn: StreakTrigger
  frequency: StreakFrequency
  precision: StreakPrecision
  private messageFormatter?: (pattern: string) => string

  constructor(config: StreakConfig) {
    super(config)
    this.minRepeat = config.minRepeat || 3
    this.conditions = [minEvents(this.minRepeat)]
    this.triggerOn = config.triggerOn || 'ongoing'
    this.frequency = config.frequency ?? 'daily'
    this.precision = config.precision ?? 'day'
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

  // predicts when the next occurrence should happen based on the median interval between past events.
  // median is used instead of mean to avoid outliers (e.g. a two-week gap) skewing the prediction.
  private predictNextDate(sortedEvents: TimestampedEvent[]): Date | null {
    if (sortedEvents.length < 2) return null

    const MS_PER_DAY = 86_400_000

    if (this.precision === 'time') {
      // full timestamp precision — useful for time-sensitive routines like medication schedules
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

    // day precision — strips time-of-day before computing intervals so a 09:00 and 23:00 event on the same day don't inflate the gap
    const dayTimestamps = sortedEvents.map(e => {
      const iso = e._date.toISOString().slice(0, 10)
      return new Date(iso).getTime()
    })

    const intervals: number[] = []
    for (let i = 1; i < dayTimestamps.length; i++) {
      const days = Math.round((dayTimestamps[i] - dayTimestamps[i - 1]) / MS_PER_DAY)
      if (days > 0) intervals.push(days)
    }

    if (!intervals.length) return null

    intervals.sort((a, b) => a - b)
    const mid = Math.floor(intervals.length / 2)
    const medianDays = intervals.length % 2
      ? intervals[mid]
      : Math.round((intervals[mid - 1] + intervals[mid]) / 2)

    const lastEvent = sortedEvents[sortedEvents.length - 1]
    return new Date(lastEvent._date.getTime() + medianDays * MS_PER_DAY)
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

    // group events by pattern in one pass — avoids re-scanning all events per pattern
    const eventsByPattern = new Map<string, typeof events>()
    for (const event of events) {
      const cat = typeof event?.category === 'string' ? event.category : ''
      const sub = typeof event?.subcategory === 'string' ? event.subcategory : ''
      const patternKey = `${cat}\x00${sub}`
      if (!eventsByPattern.has(patternKey)) eventsByPattern.set(patternKey, [])
      eventsByPattern.get(patternKey)!.push(event)
    }

    const now = new Date()
    const findings: Finding[] = []

    for (const [patternKey, patternEvents] of eventsByPattern) {
      if (patternEvents.length < this.minRepeat) continue

      const allTimestamped: TimestampedEvent[] = patternEvents
        .map((event) => {
          const parsedDate = this.parseDate(event.createdAt)
          return { ...event, _date: parsedDate ?? new Date(NaN) } as TimestampedEvent
        })
        .filter((event) => !isNaN(event._date.getTime()))
        .sort((a, b) => a._date.getTime() - b._date.getTime())

      // deduplicate to one event per day — multiple visits on the same day count as one occurrence
      const seenDays = new Set<string>()
      const sorted = allTimestamped.filter((event) => {
        const day = event._date.toISOString().slice(0, 10)
        if (seenDays.has(day)) return false
        seenDays.add(day)
        return true
      })

      if (sorted.length < this.minRepeat) continue

      let predicted = this.predictNextDate(sorted)
      if (!predicted) continue

      // For weekday-only streaks, push predicted date past any weekend
      if (this.frequency === 'weekdays') predicted = this.advancePastWeekend(predicted)

      const [category, subcategory] = patternKey.split('\x00')
      const messageData = { category, subcategory, predictedDate: predicted.toISOString() }
      const evidence = sorted.slice(-20).map((sortedEvent) => ({
        ref: this.getString(sortedEvent, 'externalRef'),
        date: sortedEvent.createdAt,
        log: this.getString(sortedEvent, 'log')
      }))
      const safeKey = `${category.replace(/[^a-zA-Z0-9-]/g, '_')}--${subcategory.replace(/[^a-zA-Z0-9-]/g, '_')}`

      if (this.triggerOn === 'ongoing' && predicted > now) {
        findings.push(this.createFinding({
          id: `recurring-${entry.externalRef}-${safeKey}`,
          message: this.buildMessage(messageData),
          notificationType: NotificationTypes.REMINDER,
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
            notificationType: NotificationTypes.WARNING,
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
