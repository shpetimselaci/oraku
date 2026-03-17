import { vi, describe, it, expect } from 'vitest'

vi.mock('../notifications', () => ({
  generateNotifications: vi.fn().mockResolvedValue('1. Keep up your routine!')
}))

process.env.GROQ_API_KEY = 'test-key'

import { runPipeline } from '../core/pipeline'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const detectorConfigs = [
  { name: 'routine-streak', type: 'streak-ongoing' as const, dataSource: 'routine', minRepeat: 3, severity: 'info' as const }
]

const userEvents = (userId: string, subcategory: string) => [
  { externalRef: `${userId}-1`, category: 'routine', subcategory, createdAt: daysAgo(6), meta: { userId } },
  { externalRef: `${userId}-2`, category: 'routine', subcategory, createdAt: daysAgo(3), meta: { userId } },
  { externalRef: `${userId}-3`, category: 'routine', subcategory, createdAt: daysAgo(0), meta: { userId } },
]

describe('runPipeline', () => {
  it('returns findings keyed by userId', async () => {
    const result = await runPipeline(userEvents('user-1', 'handwash'), { detectorConfigs })
    expect(result.count).toBeGreaterThan(0)
    const userFindings = result.findings.filter(f => f.groupKey === 'user-1')
    expect(userFindings.length).toBeGreaterThan(0)
  })

  it('groups findings for all users when forUserId is not set', async () => {
    const events = [...userEvents('user-1', 'handwash'), ...userEvents('user-2', 'cleanup')]
    const result = await runPipeline(events, { detectorConfigs })
    const user1Findings = result.findings.filter(f => f.groupKey === 'user-1')
    const user2Findings = result.findings.filter(f => f.groupKey === 'user-2')
    expect(user1Findings.length).toBeGreaterThan(0)
    expect(user2Findings.length).toBeGreaterThan(0)
  })

  it('forUserId still detects findings for all users — only notification generation is scoped', async () => {
    const events = [...userEvents('user-1', 'handwash'), ...userEvents('user-2', 'cleanup')]
    const result = await runPipeline(events, { detectorConfigs, forUserId: 'user-1' })
    expect(result.notificationsByUser['user-1']).toBeDefined()
    expect(result.notificationsByUser['user-2']).toBeUndefined()
  })

  it('returns empty notificationsByUser when no detectorConfigs registered', async () => {
    const result = await runPipeline(userEvents('user-1', 'handwash'), { detectorConfigs: [] })
    expect(result.notificationsByUser).toEqual({})
  })

})
