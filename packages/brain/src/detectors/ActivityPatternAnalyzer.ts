import { BaseDetector } from './BaseDetector'
import { StreakDetector } from './StreakDetector'
import type { EventGroup, Finding, ActivityPatternAnalyzerConfig, Event } from '../types'

const MS_PER_DAY = 86_400_000

export class ActivityPatternAnalyzer extends BaseDetector {
  private ongoingStreakDetector: StreakDetector
  private breakStreakDetector: StreakDetector
  private dataSources: Set<string> | null
  private varietyLookbackDays: number
  private summaryLookbackDays: number
  private maxActivitiesInSummary: number

  constructor(config: ActivityPatternAnalyzerConfig = {}) {
    super({ name: 'ActivityPatternAnalyzer', notificationType: 'insight', ...config })

    const minRepeat = config.minStreakLength ?? 3
    this.dataSources = config.dataSources ? new Set(config.dataSources) : null
    this.varietyLookbackDays = config.varietyLookbackDays ?? 7
    this.summaryLookbackDays = config.summaryLookbackDays ?? 3
    this.maxActivitiesInSummary = config.maxActivitiesInSummary ?? 3

    this.ongoingStreakDetector = new StreakDetector({ minRepeat, triggerOn: 'ongoing' })
    this.breakStreakDetector = new StreakDetector({ minRepeat, triggerOn: 'break' })
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (!events?.length) return []

    // filter to registered categories if specified, otherwise analyse all
    if (this.dataSources) {
      events = events.filter(event => {
        const eventCategory = this.getString(event, 'category')
        return eventCategory !== undefined && this.dataSources!.has(eventCategory)
      })
      if (!events.length) return []
    }

    const filteredEntry = { ...entry, events }
    const now = Date.now()

    const [ongoingFindings, breakFindings] = await Promise.all([
      this.ongoingStreakDetector.detect(filteredEntry),
      this.breakStreakDetector.detect(filteredEntry)
    ])

    return [
      ...ongoingFindings,
      ...breakFindings,
      ...this.findDormantCategories(events, filteredEntry, now),
      ...this.summarizeRecentActivity(events, filteredEntry, now)
    ]
  }

  private findDormantCategories(events: Event[], entry: EventGroup, now: number): Finding[] {
    const cutoff = now - this.varietyLookbackDays * MS_PER_DAY

    const allCategories = new Map<string, number>()
    const recentCategories = new Set<string>()

    for (const event of events) {
      const eventCategory = this.getString(event, 'category')
      if (!eventCategory) continue

      allCategories.set(eventCategory, (allCategories.get(eventCategory) ?? 0) + 1)

      const time = this.getTimestamp(event)
      if (time && time >= cutoff) recentCategories.add(eventCategory)
    }

    if (!recentCategories.size) return []

    const dormant = [...allCategories.entries()]
      .filter(([category, count]) => count >= 2 && !recentCategories.has(category))
      .map(([category]) => category)

    if (!dormant.length) return []

    return [
      this.createFinding({
        id: `variety-${entry.externalRef ?? 'auto'}`,
        notificationType: 'nudge',
        message: `Not seen this week: ${dormant.join(', ')}`,
        evidence: { type: 'variety', missingCategories: dormant }
      })
    ]
  }

  private summarizeRecentActivity(events: Event[], entry: EventGroup, now: number): Finding[] {
    const cutoff = now - this.summaryLookbackDays * MS_PER_DAY
    const seen = new Set<string>()
    const recentActivities: string[] = []

    for (const event of events) {
      const time = this.getTimestamp(event)
      if (!time || time < cutoff) continue

      const activityLabel = this.getEventLabel(event)?.trim()
      if (!activityLabel) continue
      const labelKey = activityLabel.toLowerCase()
      if (!seen.has(labelKey)) {
        seen.add(labelKey)
        recentActivities.push(activityLabel)
      }
    }

    if (!recentActivities.length) return []

    const shown = recentActivities.slice(0, this.maxActivitiesInSummary)
    const remaining = recentActivities.length - shown.length

    return [
      this.createFinding({
        id: `summary-${entry.externalRef ?? 'auto'}`,
        notificationType: 'insight',
        message: `Recent activity summary (${recentActivities.length} unique activities in last ${this.summaryLookbackDays} days)`,
        evidence: { type: 'summary', count: recentActivities.length, topActivities: shown }
      })
    ]
  }

}

export default ActivityPatternAnalyzer
