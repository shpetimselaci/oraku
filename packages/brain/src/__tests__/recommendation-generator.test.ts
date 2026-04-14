import { describe, it, expect, beforeEach } from 'vitest'
import { RecommendationGenerator } from '../detectors/recommendation-generator'
import type { EventGroup } from '../types'

function makeGroup(ref: string, events: object[]): EventGroup {
  return { externalRef: ref, events: events as any, count: events.length }
}

function makeEvent(userId: string, category: string, name: string, username?: string) {
  return { category, name, meta: { userId, ...(username ? { username } : {}) } }
}

describe('RecommendationGenerator', () => {
  let generator: RecommendationGenerator

  beforeEach(() => {
    generator = new RecommendationGenerator()
  })

  it('returns no findings from detect() — only collects data', async () => {
    const group = makeGroup('user-1', [makeEvent('user-1', 'routine', 'handwash')])
    const findings = await generator.detect(group)
    expect(findings).toHaveLength(0)
  })

  it('produces one profile finding per user after finalize()', async () => {
    await generator.detect(makeGroup('user-1', [
      makeEvent('user-1', 'routine', 'handwash'),
      makeEvent('user-1', 'meals', 'lunch')
    ]))
    await generator.detect(makeGroup('user-2', [
      makeEvent('user-2', 'routine', 'gym')
    ]))

    const findings = await generator.finalize()
    const profiles = findings.filter(f => String(f.id).startsWith('profile-'))
    expect(profiles).toHaveLength(2)
  })

  it('produces an engagement summary finding after finalize()', async () => {
    await generator.detect(makeGroup('user-1', [makeEvent('user-1', 'routine', 'handwash')]))

    const findings = await generator.finalize()
    const summary = findings.find(f => f.id === 'engagement-summary')
    expect(summary).toBeDefined()
    expect(summary?.evidence.totalUsers).toBe(1)
  })

  it('tracks unique activities per user correctly', async () => {
    await generator.detect(makeGroup('user-1', [
      makeEvent('user-1', 'routine', 'handwash'),
      makeEvent('user-1', 'routine', 'handwash'), // duplicate — should count once
      makeEvent('user-1', 'meals', 'lunch')
    ]))

    const findings = await generator.finalize()
    const profile = findings.find(f => f.id === 'profile-user-1')
    expect(profile?.evidence.totalLogged).toBe(2) // handwash + lunch
  })

  it('surfaces activities other users do that this user hasnt logged', async () => {
    await generator.detect(makeGroup('user-1', [
      makeEvent('user-1', 'routine', 'handwash')
    ]))
    await generator.detect(makeGroup('user-2', [
      makeEvent('user-2', 'routine', 'handwash'),
      makeEvent('user-2', 'routine', 'gym') // user-1 hasn't done this
    ]))

    const findings = await generator.finalize()
    const profile = findings.find(f => f.id === 'profile-user-1')
    const gaps = profile?.evidence.notYetLoggedByThisUser as string[] | undefined
    expect(gaps?.some(g => g.includes('gym'))).toBe(true)
  })

  it('does not surface gaps when there is only one user', async () => {
    await generator.detect(makeGroup('user-1', [
      makeEvent('user-1', 'routine', 'handwash')
    ]))

    const findings = await generator.finalize()
    const profile = findings.find(f => f.id === 'profile-user-1')
    expect(profile?.evidence.notYetLoggedByThisUser).toBeUndefined()
  })

  it('uses username from meta when available', async () => {
    await generator.detect(makeGroup('user-1', [
      makeEvent('user-1', 'routine', 'handwash', 'Devon')
    ]))

    const findings = await generator.finalize()
    const profile = findings.find(f => f.id === 'profile-user-1')
    expect(profile?.message).toContain('Devon')
  })

  it('returns empty findings from finalize() when no events were processed', async () => {
    const findings = await generator.finalize()
    expect(findings).toHaveLength(0)
  })
})
