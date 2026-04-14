import { describe, it, expect } from 'vitest'
import { DetectorBuilder } from '../detectors/detector-builder'
import { DetectorManager } from '../detectors/detector-manager'
import { StreakDetector } from '../detectors/streak-detector'
import { ChecklistDetector } from '../detectors/checklist-detector'
import type { EventGroup, EventGroupMap } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function makeGroup(ref: string, events: object[]): EventGroup {
  return { externalRef: ref, events: events as any, count: events.length }
}

function makeGroupMap(...groups: EventGroup[]): EventGroupMap {
  return Object.fromEntries(groups.map(g => [g.externalRef, g]))
}

// Three recurring events in category 'meals'
const mealsGroup = makeGroup('user-1', [
  { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(6) },
  { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(3) },
  { category: 'meals', subcategory: 'lunch', createdAt: daysAgo(0) },
])

// Three recurring events in category 'routine'
const routineGroup = makeGroup('user-2', [
  { category: 'routine', subcategory: 'gym', createdAt: daysAgo(6) },
  { category: 'routine', subcategory: 'gym', createdAt: daysAgo(3) },
  { category: 'routine', subcategory: 'gym', createdAt: daysAgo(0) },
])

// Mixed group — both categories
const mixedGroup = makeGroup('user-3', [
  { category: 'meals',   subcategory: 'lunch', createdAt: daysAgo(6) },
  { category: 'meals',   subcategory: 'lunch', createdAt: daysAgo(3) },
  { category: 'meals',   subcategory: 'lunch', createdAt: daysAgo(0) },
  { category: 'routine', subcategory: 'gym',   createdAt: daysAgo(6) },
  { category: 'routine', subcategory: 'gym',   createdAt: daysAgo(3) },
  { category: 'routine', subcategory: 'gym',   createdAt: daysAgo(0) },
])

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DetectorBuilder — marker filtering', () => {
  it('only passes events matching the marker to the inner detector', async () => {
    const built = new DetectorBuilder(new StreakDetector({ name: 'meals-streak', minRepeat: 3 }))
      .addMarker('meals')
      .build()

    // meals events → findings
    const mealsFindings = await built.detect(mealsGroup)
    expect(mealsFindings.length).toBeGreaterThan(0)

    // routine events → filtered out, no findings
    const routineFindings = await built.detect(routineGroup)
    expect(routineFindings).toHaveLength(0)
  })

  it('or marker passes events from either category', async () => {
    const built = new DetectorBuilder(new StreakDetector({ name: 'combined-streak', minRepeat: 3 }))
      .addMarker('meals or routine')
      .build()

    const mealsFindings   = await built.detect(mealsGroup)
    const routineFindings = await built.detect(routineGroup)
    expect(mealsFindings.length).toBeGreaterThan(0)
    expect(routineFindings.length).toBeGreaterThan(0)
  })

  it('not marker excludes matching events', async () => {
    const built = new DetectorBuilder(new StreakDetector({ name: 'no-meals', minRepeat: 3 }))
      .addMarker('not meals')
      .build()

    // meals events all excluded → no findings
    const findings = await built.detect(mealsGroup)
    expect(findings).toHaveLength(0)
  })
})

describe('DetectorBuilder — compose', () => {
  it('compose merges two builders — each filtered by their own markers', async () => {
    // mirrors plan.md:
    //   builder1 = new DetectorBuilder(seedData1)
    //   builder2 = new DetectorBuilder(seedData2)
    //   builder1.addMarker('meals')
    //   builder2.addMarker('routine')
    //   builder3 = builder1.compose(builder2)

    const builder1 = new DetectorBuilder(new StreakDetector({ name: 'meals-streak',   minRepeat: 3 }))
    const builder2 = new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 3 }))
    builder1.addMarker('meals')
    builder2.addMarker('routine')

    const builder3 = builder1.compose(builder2)
    const built = builder3.build()

    // mixed group has both — should get findings from both inner detectors
    const findings = await built.detect(mixedGroup)
    const mealsHits   = findings.filter(f => f.detector === 'meals-streak')
    const routineHits = findings.filter(f => f.detector === 'routine-streak')
    expect(mealsHits.length).toBeGreaterThan(0)
    expect(routineHits.length).toBeGreaterThan(0)
  })
})

describe('DetectorBuilder — clone', () => {
  it('clone produces an independent copy — mutations do not affect the original', async () => {
    // mirrors plan.md:
    //   builder4 = builder3.clone().addMarker('x or y').build()

    const base = new DetectorBuilder(new StreakDetector({ name: 'base-streak', minRepeat: 3 }))
      .addMarker('meals')

    const variant = base.clone().addMarker('not lunch').build()
    const original = base.build()

    // original still accepts lunch events
    const originalFindings = await original.detect(mealsGroup)
    expect(originalFindings.length).toBeGreaterThan(0)

    // variant excludes lunch — no findings from the meals+lunch group
    const variantFindings = await variant.detect(mealsGroup)
    expect(variantFindings).toHaveLength(0)
  })
})

describe('DetectorBuilder — DetectorManager integration', () => {
  it('builders slot into tier-1 via DetectorManager', async () => {
    const builder = new DetectorBuilder(new StreakDetector({ name: 'meals-streak', minRepeat: 3 }))
      .addMarker('meals')

    const manager = new DetectorManager({ builders: [builder] })
    const findings = await manager.runDetectorsOn(makeGroupMap(mealsGroup))

    expect(findings.filter(f => f.detector === 'meals-streak').length).toBeGreaterThan(0)
  })

  it('builder marker correctly excludes non-matching groups from tier-1', async () => {
    const builder = new DetectorBuilder(new StreakDetector({ name: 'meals-streak', minRepeat: 3 }))
      .addMarker('meals')

    const manager = new DetectorManager({ builders: [builder] })

    // routine events don't match 'meals' marker — builder finds nothing
    const findings = await manager.runDetectorsOn(makeGroupMap(routineGroup))
    expect(findings.filter(f => f.detector === 'meals-streak')).toHaveLength(0)
  })
})
