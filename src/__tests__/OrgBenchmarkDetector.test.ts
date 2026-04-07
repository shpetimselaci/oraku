import { describe, it, expect } from 'vitest'
import { OrgBenchmarkDetector } from '../detectors/OrgBenchmarkDetector'
import type { EventGroupMap, PersistedUserProfile } from '../types'

const ORG_ID = 'org-test-001'
const ORG_NAME = 'Test Corp'

function today(timeUTC = '10:00:00.000Z'): string {
  return new Date().toISOString().slice(0, 10) + 'T' + timeUTC
}

function daysAgo(n: number, timeUTC = '10:00:00.000Z'): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10) + 'T' + timeUTC
}

function makeProfile(ref: string, orgId = ORG_ID): PersistedUserProfile {
  return {
    externalRef: ref,
    organizationId: orgId,
    organizationName: ORG_NAME,
    topCategories: [{ category: 'communication', count: 10 }],
    topSubcategories: [{ subcategory: 'sms_sent', count: 10 }],
    dailyPattern: { '9': 5, '14': 3 },
    lastUpdated: new Date().toISOString()
  }
}

function makeGroups(refs: string[], withTodayEvent = true): EventGroupMap {
  return Object.fromEntries(refs.map(ref => [
    ref,
    {
      externalRef: ref,
      events: [
        { externalRef: ref, category: 'communication', subcategory: 'sms_sent', createdAt: daysAgo(3) },
        { externalRef: ref, category: 'communication', subcategory: 'sms_sent', createdAt: daysAgo(8) },
        ...(withTodayEvent ? [{ externalRef: ref, category: 'communication', subcategory: 'sms_sent', createdAt: today() }] : [])
      ] as any,
      first: daysAgo(8),
      last: today(),
      count: withTodayEvent ? 3 : 2
    }
  ]))
}

function makeProfiles(count: number, orgId = ORG_ID): PersistedUserProfile[] {
  return Array.from({ length: count }, (_, i) => makeProfile(`user-${i}`, orgId))
}

describe('OrgBenchmarkDetector', () => {
  it('returns empty when no profiles are provided', async () => {
    const detector = new OrgBenchmarkDetector()
    const findings = await detector.detectAll({}, [])
    expect(findings).toHaveLength(0)
  })

  it('returns empty when org has fewer than 30 users', async () => {
    const profiles = makeProfiles(29)
    const groups = makeGroups(profiles.map(p => p.externalRef))
    const detector = new OrgBenchmarkDetector()
    const findings = await detector.detectAll(groups, profiles)
    expect(findings).toHaveLength(0)
  })

  it('emits one finding per user when org has 30 or more users', async () => {
    const profiles = makeProfiles(30)
    const groups = makeGroups(profiles.map(p => p.externalRef))
    const detector = new OrgBenchmarkDetector()
    const findings = await detector.detectAll(groups, profiles)
    expect(findings).toHaveLength(30)
  })

  it('each finding has the correct detector name and type', async () => {
    const profiles = makeProfiles(30)
    const groups = makeGroups(profiles.map(p => p.externalRef))
    const findings = await new OrgBenchmarkDetector().detectAll(groups, profiles)
    for (const f of findings) {
      expect(f.detector).toBe('org-benchmark')
      expect(f.notificationType).toBe('insight')
    }
  })

  it('each finding is tagged with the correct groupKey', async () => {
    const profiles = makeProfiles(30)
    const groups = makeGroups(profiles.map(p => p.externalRef))
    const findings = await new OrgBenchmarkDetector().detectAll(groups, profiles)
    const keys = findings.map(f => f.groupKey as string)
    for (const profile of profiles) {
      expect(keys).toContain(profile.externalRef)
    }
  })

  it('todayRates reflects the % of org users active per category today', async () => {
    const profiles = makeProfiles(30)
    // half have today events, half do not
    const refs = profiles.map(p => p.externalRef)
    const withToday = refs.slice(0, 15)
    const withoutToday = refs.slice(15)
    const groups: EventGroupMap = {
      ...makeGroups(withToday, true),
      ...makeGroups(withoutToday, false)
    }

    const findings = await new OrgBenchmarkDetector().detectAll(groups, profiles)
    const evidence = findings[0].evidence as Record<string, unknown>
    const todayRates = evidence.todayRates as Record<string, number>
    expect(todayRates['communication']).toBe(50) // 15/30 = 50%
  })

  it('topThisWeek contains the most active categories this week', async () => {
    const profiles = makeProfiles(30)
    const groups = makeGroups(profiles.map(p => p.externalRef))
    const findings = await new OrgBenchmarkDetector().detectAll(groups, profiles)
    const evidence = findings[0].evidence as Record<string, unknown>
    const topThisWeek = evidence.topThisWeek as Array<{ category: string; count: number }>
    expect(topThisWeek.length).toBeGreaterThan(0)
    expect(topThisWeek[0]).toHaveProperty('category')
    expect(topThisWeek[0]).toHaveProperty('count')
  })

  it('does not emit findings for users not present in the groups map', async () => {
    const profiles = makeProfiles(30)
    // only provide groups for first 20 users
    const groups = makeGroups(profiles.slice(0, 20).map(p => p.externalRef))
    const findings = await new OrgBenchmarkDetector().detectAll(groups, profiles)
    // only 20 users have groups, benchmark emits for those only
    expect(findings).toHaveLength(20)
  })

  it('keeps orgs separate — does not mix users across orgs', async () => {
    const org1Profiles = makeProfiles(30, 'org-1')
    const org2Profiles = makeProfiles(30, 'org-2')
    const allProfiles = [...org1Profiles, ...org2Profiles]
    const groups = makeGroups(allProfiles.map(p => p.externalRef))

    const findings = await new OrgBenchmarkDetector().detectAll(groups, allProfiles)
    expect(findings).toHaveLength(60) // 30 per org

    const org1Findings = findings.filter(f => (f.evidence as any).organizationId === 'org-1')
    const org2Findings = findings.filter(f => (f.evidence as any).organizationId === 'org-2')
    expect(org1Findings).toHaveLength(30)
    expect(org2Findings).toHaveLength(30)
  })
})
