import { BaseDetector } from './BaseDetector'
import { minEvents } from '../filters/detectorConditions'
import { items } from './helpers/itemMatching'
import { NotificationTypes } from './helpers/notificationTypes'
import type { Event, EventGroup, Finding, ExpectedItem, MilestoneConfig } from '../types'

export class MilestoneDetector extends BaseDetector {
  readonly conditions = [minEvents(1)]
  private milestones: ExpectedItem[]
  private extractActual: (event: Event) => string | string[]
private messageFormatter: string | ((achieved: string[]) => string)
  private todayOnly: boolean

  constructor(config: MilestoneConfig) {
    super({ ...config, notificationType: config.notificationType ?? NotificationTypes.ACHIEVEMENT })
    this.milestones = config.milestones
    this.extractActual = config.extractActual ?? ((event: Event) => this.getString(event, 'name')?.toLowerCase() ?? '')
this.messageFormatter = config.message ?? ((achieved: string[]) => `Achieved: ${achieved.join(', ')}`)
    this.todayOnly = config.todayOnly !== false
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (!events.length) return []

    if (this.todayOnly) events = this.filterByDate(events, new Date(), 'day')
    if (!events.length) return []

    const actualItems = items.extract(events, this.extractActual)
    if (!actualItems.length) return []

    const { covered } = items.match(actualItems, this.milestones)
    if (covered.size < this.milestones.length) return []

    const achieved = Array.from(covered)
    const dateStr = this.todayString()
    const identifier = entry?.externalRef ?? 'user'

    return [this.createFinding({
      id: `milestone-${this.name.toLowerCase()}-${identifier}-${dateStr}`,
      notificationType: NotificationTypes.ACHIEVEMENT,
      message: typeof this.messageFormatter === 'function'
        ? this.messageFormatter(achieved)
        : this.messageFormatter,
      evidence: {
        milestones: achieved,
        achievedAt: dateStr,
        matchedItems: actualItems,
        permanent: true
      }
    })]
  }
}

export default MilestoneDetector
