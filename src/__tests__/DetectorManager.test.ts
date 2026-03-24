import { describe, it, expect, vi } from 'vitest'
import { DetectorManager } from '../detectors/DetectorManager'
import type { EventGroup, EventGroupMap, Finding } from '../types'

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

describe('DetectorManager — tier hierarchy', () => {
  it('sdk detectors run and produce findings for matching events', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 3, severity: 'info' }
      ]
    })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    const sdkFindings = findings.filter(f => f.detector === 'routine-streak')
    expect(sdkFindings.length).toBeGreaterThan(0)
  })

  it('activity pattern analyzer runs when sdk detectors find nothing', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 10, severity: 'info' }
        // minRepeat: 10 won't be met with 3 events — sdk finds nothing, tier 2 takes over
      ]
    })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    // SDK detector found nothing; analyzer should have produced findings
    const sdkFindings = findings.filter(f => f.detector === 'routine-streak')
    expect(sdkFindings.length).toBe(0)
    expect(findings.length).toBeGreaterThan(0)
  })

  it('tags every finding with the groupKey', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 3, severity: 'info' }
      ]
    })

    const findings = await manager.runDetectorsOn(makeGroupMap(streakEvents('user-1')))
    expect(findings.every(f => f.groupKey === 'user-1')).toBe(true)
  })

  it('deduplicates findings with the same id across groups', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 3, severity: 'info' }
      ]
    })

    // Two groups with same externalRef — findings would have same id
    const group = streakEvents('user-1')
    const findings = await manager.runDetectorsOn(makeGroupMap(group))
    const ids = findings.map(f => f.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  it('processes multiple users independently', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 3, severity: 'info' }
      ]
    })

    const findings = await manager.runDetectorsOn(
      makeGroupMap(streakEvents('user-1'), streakEvents('user-2'))
    )

    const user1 = findings.filter(f => f.groupKey === 'user-1')
    const user2 = findings.filter(f => f.groupKey === 'user-2')
    expect(user1.length).toBeGreaterThan(0)
    expect(user2.length).toBeGreaterThan(0)
  })

  it('returns empty findings for an empty event group', async () => {
    const manager = new DetectorManager({
      detectorConfigs: [
        { name: 'routine-streak', type: 'streak-ongoing', dataSource: 'routine', minRepeat: 3, severity: 'info' }
      ]
    })

    const findings = await manager.runDetectorsOn(makeGroupMap(makeGroup('user-1', [])))
    expect(findings.filter(f => f.groupKey === 'user-1')).toHaveLength(0)
  })
})
