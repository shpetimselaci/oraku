import type { SDKDetectorSchema, DetectorExtractConfig, DetectorApiConfig, NotificationType } from './types'

export class DetectorBuilder {
  private config: SDKDetectorSchema

  constructor(name: string, type: SDKDetectorSchema['type']) {
    this.config = { name, type }
  }

  addMarker(expression: string): this {
    this.config.marker = expression
    return this
  }

  notificationType(type: NotificationType): this {
    this.config.notificationType = type
    return this
  }

  minRepeat(n: number): this {
    this.config.minRepeat = n
    return this
  }

  expected(items: string[]): this {
    this.config.expected = items
    return this
  }

  todayOnly(value = true): this {
    this.config.todayOnly = value
    return this
  }

  dateWindow(unit: 'day' | 'week' | 'month' | 'year', value: number): this {
    this.config.dateFilter = { unit, value }
    return this
  }

  scheduleAt(time: string): this {
    this.config.scheduleAt = time
    return this
  }

  extract(config: DetectorExtractConfig): this {
    this.config.extract = config
    return this
  }

  operator(op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'): this {
    this.config.operator = op
    return this
  }

  value(n: number): this {
    this.config.value = n
    return this
  }

  aggregate(fn: 'sum' | 'avg' | 'count' | 'min' | 'max'): this {
    this.config.aggregate = fn
    return this
  }

  lookup(config: SDKDetectorSchema['lookup']): this {
    this.config.lookup = config
    return this
  }

  targets(map: Record<string, number>): this {
    this.config.targets = map
    return this
  }

  toConfig(): SDKDetectorSchema {
    return { ...this.config }
  }
}
