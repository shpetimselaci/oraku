import { describe, it, expect } from 'vitest'
import { ThresholdDetector } from '../detectors/ThresholdDetector'
import type { EventGroup } from '../types'

function todayISO(): string {
  return new Date().toISOString()
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function makeGroup(externalRef: string, events: object[]): EventGroup {
  return { externalRef, events: events as any, count: events.length }
}

describe('ThresholdDetector — operator', () => {
  it('fires when actual sum is below target (lt)', async () => {
    const detector = new ThresholdDetector({
      name: 'CalorieGoal',
      extract: { path: 'meta.calories' },
      operator: 'lt',
      value: 1500,
      aggregate: 'sum',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { calories: 400 }, createdAt: todayISO() },
      { meta: { calories: 300 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    expect(findings[0].evidence.actual).toBe(700)
    expect(findings[0].evidence.target).toBe(1500)
  })

  it('does not fire when actual meets or exceeds target (lt)', async () => {
    const detector = new ThresholdDetector({
      name: 'CalorieGoal',
      extract: { path: 'meta.calories' },
      operator: 'lt',
      value: 1500,
      aggregate: 'sum',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { calories: 800 }, createdAt: todayISO() },
      { meta: { calories: 800 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('fires when actual exceeds target (gt)', async () => {
    const detector = new ThresholdDetector({
      name: 'SodiumLimit',
      extract: { path: 'meta.sodium' },
      operator: 'gt',
      value: 2000,
      aggregate: 'sum',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { sodium: 1200 }, createdAt: todayISO() },
      { meta: { sodium: 1100 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    expect(findings[0].evidence.actual).toBe(2300)
  })
})

describe('ThresholdDetector — aggregate modes', () => {
  it('sums values across events', async () => {
    const detector = new ThresholdDetector({
      name: 'Test',
      extract: { path: 'meta.value' },
      operator: 'lt',
      value: 100,
      aggregate: 'sum',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { value: 20 }, createdAt: todayISO() },
      { meta: { value: 30 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings[0].evidence.actual).toBe(50)
  })

  it('counts events when aggregate is count', async () => {
    const detector = new ThresholdDetector({
      name: 'WaterIntake',
      extract: { path: 'meta.glasses' },
      operator: 'lt',
      value: 8,
      aggregate: 'count',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { glasses: 1 }, createdAt: todayISO() },
      { meta: { glasses: 1 }, createdAt: todayISO() },
      { meta: { glasses: 1 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    expect(findings[0].evidence.actual).toBe(3)
  })

  it('averages values across events', async () => {
    const detector = new ThresholdDetector({
      name: 'AvgScore',
      extract: { path: 'meta.score' },
      operator: 'lt',
      value: 70,
      aggregate: 'avg',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { score: 80 }, createdAt: todayISO() },
      { meta: { score: 40 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    expect(findings[0].evidence.actual).toBe(60)
  })
})

describe('ThresholdDetector — todayOnly', () => {
  it('ignores events from previous days when todayOnly is true', async () => {
    const detector = new ThresholdDetector({
      name: 'CalorieGoal',
      extract: { path: 'meta.calories' },
      operator: 'lt',
      value: 1500,
      aggregate: 'sum',
      todayOnly: true
    })

    const group = makeGroup('user-1', [
      { meta: { calories: 200 }, createdAt: daysAgo(2) },
      { meta: { calories: 200 }, createdAt: daysAgo(1) },
    ])

    // No events today → nothing to extract → no findings
    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })
})

describe('ThresholdDetector — edge cases', () => {
  it('returns no findings when group has no events', async () => {
    const detector = new ThresholdDetector({
      name: 'Test',
      extract: { path: 'meta.value' },
      operator: 'lt',
      value: 100,
      aggregate: 'sum',
      todayOnly: false
    })

    const findings = await detector.detect(makeGroup('user-1', []))
    expect(findings.length).toBe(0)
  })

  it('skips events where the path resolves to a non-numeric value', async () => {
    const detector = new ThresholdDetector({
      name: 'Test',
      extract: { path: 'meta.value' },
      operator: 'lt',
      value: 100,
      aggregate: 'sum',
      todayOnly: false
    })

    const group = makeGroup('user-1', [
      { meta: { value: 'not-a-number' }, createdAt: todayISO() },
      { meta: { value: 30 }, createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    // Only the numeric event counts — 30 < 100 → fires
    expect(findings.length).toBe(1)
    expect(findings[0].evidence.actual).toBe(30)
  })

  it('uses custom message formatter', async () => {
    const detector = new ThresholdDetector({
      name: 'CalorieGoal',
      extract: { path: 'meta.calories' },
      operator: 'lt',
      value: 1500,
      aggregate: 'sum',
      todayOnly: false,
      message: (actual, target) => `Only ${actual} of ${target} calories today`
    })

    const group = makeGroup('user-1', [
      { meta: { calories: 500 }, createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].message).toBe('Only 500 of 1500 calories today')
  })
})
