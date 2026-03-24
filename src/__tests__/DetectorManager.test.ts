import { describe, it, expect } from 'vitest'
import { DetectorManager } from '../detectors/DetectorManager'
import { DetectorBuilder } from '../detectors/DetectorBuilder'
import { StreakDetector } from '../detectors/StreakDetector'
import type { EventGroup, EventGroupMap } from '../types'

function makeGroup(ref: string, events: object[]): EventGroup {
  return { externalRef: ref, events: events as any, count: events.length }
}

function makeGroupMap(...groups: EventGroup[]): EventGroupMap {
  return Object.fromEntries(groups.map(g => [g.externalRef, g]))
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const streakEvents = (ref: string) => makeGroup(ref, [
  { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(6), meta: { userId: ref } },
  { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(3), meta: { userId: ref } },
  { category: 'routine', subcategory: 'handwash', createdAt: daysAgo(0), meta: { userId: ref } },
])

const routineStreakBuilder = () =>
  new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 3 }))
    .addMarker('routine')

describe('DetectorManager — tier hierarchy', () => {
  it('builder detectors run and produce findings for matching events', async () => {
    const manager = new DetectorManager({ builders: [routineStreakBuilder()] })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    expect(findings.filter(f => f.detector === 'routine-streak').length).toBeGreaterThan(0)
  })

  it('activity pattern analyzer runs when builder detectors find nothing', async () => {
    // minRepeat: 10 won't be met with 3 events — tier 1 finds nothing, tier 2 takes over
    const builder = new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 10 }))
      .addMarker('routine')

    const manager = new DetectorManager({ builders: [builder] })
    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))

    expect(findings.filter(f => f.detector === 'routine-streak')).toHaveLength(0)
    expect(findings.length).toBeGreaterThan(0)
  })

  it('tags every finding with the groupKey', async () => {
    const manager = new DetectorManager({ builders: [routineStreakBuilder()] })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    expect(findings.every(f => f.groupKey === 'user-1')).toBe(true)
  })

  it('deduplicates findings with the same id', async () => {
    const manager = new DetectorManager({ builders: [routineStreakBuilder()] })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    const ids = findings.map(f => f.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('processes multiple users independently', async () => {
    const manager = new DetectorManager({ builders: [routineStreakBuilder()] })

    const findings = await manager.runDetectorsOn(
      makeGroupMap(streakEvents('user-1'), streakEvents('user-2'))
    )

    expect(findings.filter(f => f.groupKey === 'user-1').length).toBeGreaterThan(0)
    expect(findings.filter(f => f.groupKey === 'user-2').length).toBeGreaterThan(0)
  })

  it('returns empty findings for an empty event group', async () => {
    const manager = new DetectorManager({ builders: [routineStreakBuilder()] })

    const findings = await manager.runDetectorsOn(makeGroupMap(makeGroup('user-1', [])))
    expect(findings.filter(f => f.groupKey === 'user-1')).toHaveLength(0)
  })
})
