import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../db/connection', async () => {
  const Database = (await import('better-sqlite3')).default
  const db = new Database(':memory:')
  return { db }
})

import { initSchema } from '../db/schema'
import { upsertProfile, getProfilesByOrg, getAllProfiles } from '../db/profiles'
import { db } from '../db/connection'
import type { EventGroup } from '../types'

function makeGroup(ref: string, orgId: string, orgName: string, events: object[]): EventGroup {
  const meta = { organizationId: orgId, organizationName: orgName }
  return {
    externalRef: ref,
    events: events.map(e => ({ ...e, meta })) as any,
    first: null,
    last: null,
    count: events.length
  }
}

function today(hour = 10): string {
  const d = new Date()
  d.setUTCHours(hour, 0, 0, 0)
  return d.toISOString()
}

describe('profiles', () => {
  beforeEach(() => {
    initSchema()
    db.exec('DELETE FROM user_activity_profiles')
  })

  it('upsertProfile saves a profile for a new user', () => {
    const group = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'communication', subcategory: 'sms_sent', createdAt: today(9) },
      { category: 'communication', subcategory: 'email_sent', createdAt: today(10) },
    ])

    upsertProfile(group)
    const profiles = getAllProfiles()
    expect(profiles).toHaveLength(1)
    expect(profiles[0].externalRef).toBe('user-1')
    expect(profiles[0].organizationId).toBe('org-1')
    expect(profiles[0].organizationName).toBe('Acme')
  })

  it('topCategories reflects event frequency', () => {
    const group = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'communication', subcategory: 'sms_sent', createdAt: today() },
      { category: 'communication', subcategory: 'sms_sent', createdAt: today() },
      { category: 'session', subcategory: 'login', createdAt: today() },
    ])

    upsertProfile(group)
    const [profile] = getAllProfiles()
    expect(profile.topCategories[0].category).toBe('communication')
    expect(profile.topCategories[0].count).toBe(2)
  })

  it('topSubcategories reflects subcategory frequency', () => {
    const group = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'communication', subcategory: 'sms_sent', createdAt: today() },
      { category: 'communication', subcategory: 'sms_sent', createdAt: today() },
      { category: 'communication', subcategory: 'email_sent', createdAt: today() },
    ])

    upsertProfile(group)
    const [profile] = getAllProfiles()
    expect(profile.topSubcategories[0].subcategory).toBe('sms_sent')
    expect(profile.topSubcategories[0].count).toBe(2)
  })

  it('dailyPattern tracks UTC hour distribution', () => {
    const group = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'session', subcategory: 'login', createdAt: today(9) },
      { category: 'session', subcategory: 'login', createdAt: today(9) },
      { category: 'session', subcategory: 'login', createdAt: today(14) },
    ])

    upsertProfile(group)
    const [profile] = getAllProfiles()
    expect(profile.dailyPattern['9']).toBe(2)
    expect(profile.dailyPattern['14']).toBe(1)
  })

  it('upsertProfile updates an existing profile on re-run', () => {
    const group1 = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'communication', subcategory: 'sms_sent', createdAt: today() },
    ])
    upsertProfile(group1)

    const group2 = makeGroup('user-1', 'org-1', 'Acme', [
      { category: 'session', subcategory: 'login', createdAt: today() },
      { category: 'session', subcategory: 'login', createdAt: today() },
    ])
    upsertProfile(group2)

    const profiles = getAllProfiles()
    expect(profiles).toHaveLength(1)
    expect(profiles[0].topCategories[0].category).toBe('session')
  })

  it('getProfilesByOrg returns only profiles for the given org', () => {
    upsertProfile(makeGroup('user-1', 'org-1', 'Acme', [{ category: 'session', subcategory: 'login', createdAt: today() }]))
    upsertProfile(makeGroup('user-2', 'org-2', 'Other', [{ category: 'session', subcategory: 'login', createdAt: today() }]))

    const org1Profiles = getProfilesByOrg('org-1')
    expect(org1Profiles).toHaveLength(1)
    expect(org1Profiles[0].externalRef).toBe('user-1')
  })

  it('getAllProfiles returns all profiles', () => {
    upsertProfile(makeGroup('user-1', 'org-1', 'Acme', [{ category: 'session', subcategory: 'login', createdAt: today() }]))
    upsertProfile(makeGroup('user-2', 'org-1', 'Acme', [{ category: 'session', subcategory: 'login', createdAt: today() }]))
    upsertProfile(makeGroup('user-3', 'org-2', 'Other', [{ category: 'session', subcategory: 'login', createdAt: today() }]))

    expect(getAllProfiles()).toHaveLength(3)
  })

  it('does nothing for a group with no events', () => {
    upsertProfile(makeGroup('user-1', 'org-1', 'Acme', []))
    expect(getAllProfiles()).toHaveLength(0)
  })
})
