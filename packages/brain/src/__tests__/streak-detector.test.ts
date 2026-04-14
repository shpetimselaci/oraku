import { describe, it, expect } from 'vitest'
import { StreakDetector } from '../detectors/streak-detector'
import type { EventGroup } from '../types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFuture(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function makeGroup(externalRef: string, events: object[]): EventGroup {
  return { externalRef, events: events as any, count: events.length }
}

// ─── Ongoing mode ────────────────────────────────────────────────────────────

describe('StreakDetector — ongoing', () => {
  it('fires a recurring finding when predicted next date is in the future', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'ongoing', minRepeat: 3 })

    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(6) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(3) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(0) },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].id).toMatch(/^recurring-/)
    expect(findings[0].detector).toBe('TestStreak')
  })

  it('does not fire when there are fewer events than minRepeat', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'ongoing', minRepeat: 3 })

    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(4) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(2) },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('does not fire when predicted date is already in the past', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'ongoing', minRepeat: 3 })

    // Events every 10 days, last one 15 days ago — predicted next is 5 days in the past
    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(35) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(25) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(15) },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('tracks each category/subcategory pattern independently', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'ongoing', minRepeat: 3 })

    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(6) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(3) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(0) },
      { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(8) },
      { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(4) },
      { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(0) },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(2)
  })
})

// ─── Break mode ───────────────────────────────────────────────────────────────

describe('StreakDetector — break', () => {
  it('fires an anomaly finding when a streak has broken', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'break', minRepeat: 3 })

    // Events every 3 days — predicted next is 3 days after daysAgo(3) = now
    // Use daysAgo(10), daysAgo(7), daysAgo(4) so predicted is daysAgo(1) — in the past
    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(10) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(7) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(4) },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].id).toMatch(/^anomaly-/)
    expect(findings[0].notificationType).toBe('warning')
  })

  it('does not fire when a recent event covers the expected slot', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'break', minRepeat: 3 })

    // Same pattern but with a recent event after the predicted date
    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(10) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(7) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(4) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(1) }, // covers the break
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('only checks same-pattern events (not unrelated categories)', async () => {
    const detector = new StreakDetector({ name: 'TestStreak', triggerOn: 'break', minRepeat: 3 })

    // health/checkup streak is broken, but meals/lunch has a recent event
    // The bug this tests: meals/lunch event should NOT suppress the health/checkup anomaly
    const group = makeGroup('user-1', [
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(10) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(7) },
      { category: 'health', subcategory: 'checkup', createdAt: daysAgo(4) },
      { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(1) }, // unrelated — should not suppress
    ])

    const findings = await detector.detect(group)
    const anomalies = findings.filter(f => f.id.startsWith('anomaly-'))
    expect(anomalies.length).toBeGreaterThan(0)
  })
})
