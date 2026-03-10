import { BaseDetector } from './BaseDetector'
import { StreakDetector } from './StreakDetector'
import type { EventGroup, Finding, ActivityPatternAnalyzerConfig, Event } from '../types'

const MS_PER_DAY = 86_400_000
const VARIETY_LOOKBACK_DAYS = 7
const SUMMARY_LOOKBACK_DAYS = 3
const MAX_ACTIVITIES_IN_SUMMARY = 3

export class ActivityPatternAnalyzer extends BaseDetector {
  private ongoingStreakDetector: StreakDetector
  private breakStreakDetector: StreakDetector

  constructor(config: ActivityPatternAnalyzerConfig = {}) {
    super({ name: 'ActivityPatternAnalyzer', severity: 'info', ...config })

    const minRepeat = config.minStreakLength ?? 3

    this.ongoingStreakDetector = new StreakDetector({ minRepeat, triggerOn: 'ongoing' })
    this.breakStreakDetector = new StreakDetector({ minRepeat, triggerOn: 'break' })
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const events = this.getEvents(entry)
    if (!events?.length) return []

    const now = Date.now()

    const [ongoingFindings, breakFindings] = await Promise.all([
      this.ongoingStreakDetector.detect(entry),
      this.breakStreakDetector.detect(entry)
    ])

    return [
      ...ongoingFindings,
      ...breakFindings,
      ...this.findDormantCategories(events, entry, now),
      ...this.summarizeRecentActivity(events, entry, now)
    ]
  }

  private findDormantCategories(events: Event[], entry: EventGroup, now: number): Finding[] {
    const cutoff = now - VARIETY_LOOKBACK_DAYS * MS_PER_DAY

    const allCategories = new Map<string, number>()
    const recentCategories = new Set<string>()

    for (const e of events) {
      const category = e.category
      if (!category) continue

      allCategories.set(category, (allCategories.get(category) ?? 0) + 1)

      const time = this.getTimestamp(e)
      if (time && time >= cutoff) recentCategories.add(category)
    }

    if (!recentCategories.size) return []

    const dormant = [...allCategories.entries()]
      .filter(([cat, count]) => count >= 2 && !recentCategories.has(cat))
      .map(([cat]) => cat)

    if (!dormant.length) return []

    return [
      this.createFinding({
        id: `variety-${entry.externalRef ?? 'auto'}`,
        severity: 'info',
        message: `📋 Not seen this week: ${dormant.join(', ')}`,
        evidence: { type: 'variety', missingCategories: dormant }
      })
    ]
  }

  private summarizeRecentActivity(events: Event[], entry: EventGroup, now: number): Finding[] {
    const cutoff = now - SUMMARY_LOOKBACK_DAYS * MS_PER_DAY
    const seen = new Set<string>()
    const recentActivities: string[] = []

    for (const e of events) {
      const time = this.getTimestamp(e)
      if (!time || time < cutoff) continue

      const name = (e.name ?? e.log)?.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        recentActivities.push(name)
      }
    }

    if (!recentActivities.length) return []

    const shown = recentActivities.slice(0, MAX_ACTIVITIES_IN_SUMMARY)
    const remaining = recentActivities.length - shown.length

    return [
      this.createFinding({
        id: `summary-${entry.externalRef ?? 'auto'}`,
        severity: 'success',
        message: `✅ Recent: ${shown.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}`,
        evidence: { type: 'summary', count: recentActivities.length, activities: recentActivities }
      })
    ]
  }

  private getTimestamp(e: Event): number | null {
    const raw = e.createdAt ?? e.date
    if (!raw) return null
    const t = new Date(raw).getTime()
    return Number.isNaN(t) ? null : t
  }
}

export default ActivityPatternAnalyzer
