import { BaseDetector } from './BaseDetector'
import { minEvents } from '../filters/detectorConditions'
import { resolvePath } from './helpers/itemMatching'
import type { EventGroup, Finding, Event, ThresholdOperator, ThresholdAggregate, ThresholdConfig } from '../types'

const AGGREGATES: Record<ThresholdAggregate, (values: number[]) => number> = {
  sum:   values => values.reduce((a, b) => a + b, 0),
  avg:   values => values.reduce((a, b) => a + b, 0) / values.length,
  count: values => values.length,
  min:   values => Math.min(...values),
  max:   values => Math.max(...values),
}

const OPERATORS: Record<ThresholdOperator, (a: number, b: number) => boolean> = {
  lt:  (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt:  (a, b) => a > b,
  gte: (a, b) => a >= b,
  eq:  (a, b) => a === b,
}

export class ThresholdDetector extends BaseDetector {
  readonly conditions = [minEvents(1)]
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
    this.todayOnly = config.todayOnly ?? true
    this.messageFormatter = config.message ?? ((actual, target) => `Value ${actual} did not meet target ${target}`)
    this.extractFn = ThresholdDetector.buildExtractFn(config.extract)
  }

  private static buildExtractFn(extract: ThresholdConfig['extract']): (event: Event) => number | null {
    if (typeof extract === 'function') return extract
    const { path } = extract
    return (event: Event) => {
      const num = Number(resolvePath(event, path))
      return Number.isNaN(num) ? null : num
    }
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    let events = this.getEvents(entry)
    if (this.todayOnly) events = this.filterByDate(events, new Date(), 'day')
    if (!events.length) return []

    const values = events.map(e => this.extractFn(e)).filter((v): v is number => v !== null)
    if (!values.length) return []

    const actual = AGGREGATES[this.aggregate](values)
    if (!OPERATORS[this.operator](actual, this.thresholdValue)) return []

    const message = typeof this.messageFormatter === 'function'
      ? this.messageFormatter(actual, this.thresholdValue)
      : this.messageFormatter

    return [
      this.createFinding({
        id: `threshold-${this.name.toLowerCase()}-${entry.externalRef ?? 'auto'}-${this.todayString()}`,
        message,
        evidence: { actual, target: this.thresholdValue, operator: this.operator, aggregate: this.aggregate }
      })
    ]
  }

}

export default ThresholdDetector
