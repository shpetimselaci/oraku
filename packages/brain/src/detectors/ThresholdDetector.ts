import { BaseDetector } from './BaseDetector'
import { resolvePath } from './helpers/itemMatching'
import type { EventGroup, Finding, Event, ThresholdOperator, ThresholdAggregate, ThresholdConfig } from '../types'


export class ThresholdDetector extends BaseDetector {
  private extractFn: (event: Event) => number | null
  private operator: ThresholdOperator
  private thresholdValue: number
  private aggregate: ThresholdAggregate
  private todayOnly: boolean
  private messageFormatter: string | ((actual: number, target: number) => string)

  constructor(config: ThresholdConfig) {
    super(config)
    if (typeof config.extract !== 'function' && !config.extract?.path) throw new Error(`ThresholdDetector "${config.name}" requires extract.path`)
    if (!config.operator) throw new Error(`ThresholdDetector "${config.name}" requires operator`)
    if (config.value === undefined) throw new Error(`ThresholdDetector "${config.name}" requires value`)
    this.operator = config.operator
    this.thresholdValue = config.value
    this.aggregate = config.aggregate ?? 'sum'
    this.todayOnly = config.todayOnly !== false
    this.messageFormatter = config.message ?? ((actual, target) => `Value ${actual} did not meet target ${target}`)

    if (typeof config.extract === 'function') {
      this.extractFn = config.extract
    } else {
      const path = config.extract.path
      this.extractFn = (event: Event) => {
        const val = resolvePath(event, path)
        const num = Number(val)
        return Number.isNaN(num) ? null : num
      }
    }
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (!events.length) return []

    if (this.todayOnly) {
      events = this.filterByDate(events, new Date(), 'day')
    }

    if (!events.length) return []

    const values = events.map(e => this.extractFn(e)).filter((v): v is number => v !== null)
    if (!values.length) return []

    let actual: number
    switch (this.aggregate) {
      case 'avg': actual = values.reduce((a, b) => a + b, 0) / values.length; break
      case 'count': actual = values.length; break
      case 'min': actual = Math.min(...values); break
      case 'max': actual = Math.max(...values); break
      default: actual = values.reduce((a, b) => a + b, 0) // sum
    }

    if (!this.compare(actual, this.thresholdValue)) return []

    const dateStr = this.todayString()
    return [
      this.createFinding({
        id: `threshold-${this.name.toLowerCase()}-${entry.externalRef ?? 'auto'}-${dateStr}`,
        message: typeof this.messageFormatter === 'function'
          ? this.messageFormatter(actual, this.thresholdValue)
          : this.messageFormatter,
        evidence: { actual, target: this.thresholdValue, operator: this.operator, aggregate: this.aggregate }
      })
    ]
  }

  private compare(actual: number, target: number): boolean {
    switch (this.operator) {
      case 'lt': return actual < target
      case 'lte': return actual <= target
      case 'gt': return actual > target
      case 'gte': return actual >= target
      case 'eq': return actual === target
      default: return false
    }
  }
}

export default ThresholdDetector
