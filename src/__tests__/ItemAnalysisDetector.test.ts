import { describe, it, expect } from 'vitest'
import { ItemAnalysisDetector } from '../detectors/ItemAnalysisDetector'
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

const nutritionMap = {
  apple: { protein: 0.3, vitamin_c: 8, calcium: 6 },
  milk:  { protein: 3.4, calcium: 125 },
  bread: { protein: 2.7, calcium: 20 }
}

describe('ItemAnalysisDetector — static map', () => {
  it('fires with gaps when items do not cover all targets', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10, calcium: 200, vitamin_c: 15 },
      todayOnly: false
    })

    // apple + milk → protein: 3.7, calcium: 131, vitamin_c: 8 — all below targets
    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple', 'milk'] }, createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    const gaps = findings[0].evidence.gaps as string[]
    expect(gaps).toContain('protein')
    expect(gaps).toContain('calcium')
    expect(gaps).toContain('vitamin_c')
  })

  it('does not fire when all targets are met', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 3, calcium: 100 },  // low targets — easy to meet
      todayOnly: false
    })

    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple', 'milk', 'bread'] }, createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('aggregates properties across multiple events', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: false
    })

    // Two events, each with some food — totals should combine
    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple'] }, createdAt: todayISO() },   // protein: 0.3
      { meta: { foodsServed: ['milk', 'bread'] }, createdAt: todayISO() }, // protein: 3.4 + 2.7 = 6.1
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    const totals = findings[0].evidence.totals as Record<string, number>
    expect(totals.protein).toBeCloseTo(6.4, 1) // 0.3 + 3.4 + 2.7
  })

  it('handles unknown items gracefully — skips them without crashing', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: false
    })

    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['pizza', 'apple'] }, createdAt: todayISO() } // pizza not in map
    ])

    const findings = await detector.detect(group)
    // pizza skipped, only apple counted — protein: 0.3 < 10 → fires
    expect(findings.length).toBe(1)
    const totals = findings[0].evidence.totals as Record<string, number>
    expect(totals.protein).toBeCloseTo(0.3, 1)
  })

  it('returns no findings when group has no events', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: false
    })

    const findings = await detector.detect(makeGroup('daycare-1', []))
    expect(findings.length).toBe(0)
  })

  it('includes itemsAnalyzed and targets in evidence', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: false
    })

    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple'] }, createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].evidence.itemsAnalyzed).toContain('apple')
    expect(findings[0].evidence.targets).toEqual({ protein: 10 })
  })
})

describe('ItemAnalysisDetector — todayOnly', () => {
  it('ignores events from previous days when todayOnly is true', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: true
    })

    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple'] }, createdAt: daysAgo(2) }
    ])

    // No events today → no findings
    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })
})

describe('ItemAnalysisDetector — custom message', () => {
  it('uses custom message formatter', async () => {
    const detector = new ItemAnalysisDetector({
      name: 'DaycareNutrition',
      extract: { path: 'meta.foodsServed' },
      lookup: { map: nutritionMap },
      targets: { protein: 10 },
      todayOnly: false,
      message: (gaps) => `Today's menu is missing: ${gaps.join(', ')}`
    })

    const group = makeGroup('daycare-1', [
      { meta: { foodsServed: ['apple'] }, createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].message).toBe("Today's menu is missing: protein")
  })
})
