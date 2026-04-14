import { describe, it, expect } from 'vitest'
import { ActivityPatternAnalyzer } from '../detectors/activity-pattern-analyzer'
import type { EventGroup } from '../types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function makeGroup(ref: string, events: object[]): EventGroup {
  return { externalRef: ref, events: events as any, count: events.length }
}

describe('ActivityPatternAnalyzer — dataSources filter', () => {
  it('returns [] when no dataSources configured', async () => {
    const analyzer = new ActivityPatternAnalyzer()
    const group = makeGroup('user-1', [
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(0) }
    ])
    expect(await analyzer.detect(group)).toHaveLength(0)
  })

  it('returns [] when events do not match any registered dataSource', async () => {
    const analyzer = new ActivityPatternAnalyzer({ dataSources: ['routine'] })
    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(0) }
    ])
    expect(await analyzer.detect(group)).toHaveLength(0)
  })

  it('returns [] when group has no events', async () => {
    const analyzer = new ActivityPatternAnalyzer({ dataSources: ['routine'] })
    expect(await analyzer.detect(makeGroup('user-1', []))).toHaveLength(0)
  })
})

describe('ActivityPatternAnalyzer — streak detection', () => {
  it('fires an ongoing streak finding for a matching category', async () => {
    const analyzer = new ActivityPatternAnalyzer({ dataSources: ['routine'], minStreakLength: 3 })
    const group = makeGroup('user-1', [
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(6) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(3) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(0) },
    ])
    const findings = await analyzer.detect(group)
    const ongoing = findings.filter(f => String(f.id).startsWith('recurring-'))
    expect(ongoing.length).toBeGreaterThan(0)
  })

  it('fires a break finding when a streak is broken', async () => {
    const analyzer = new ActivityPatternAnalyzer({ dataSources: ['routine'], minStreakLength: 3 })
    const group = makeGroup('user-1', [
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(10) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(7) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(4) },
    ])
    const findings = await analyzer.detect(group)
    const breaks = findings.filter(f => String(f.id).startsWith('anomaly-'))
    expect(breaks.length).toBeGreaterThan(0)
  })

  it('ignores events from unregistered categories', async () => {
    const analyzer = new ActivityPatternAnalyzer({ dataSources: ['routine'], minStreakLength: 3 })
    const group = makeGroup('user-1', [
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(6) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(3) },
      { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(0) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(1) },
    ])
    const findings = await analyzer.detect(group)
    expect(findings.every(f => !String(f.message).includes('health'))).toBe(true)
  })
})
