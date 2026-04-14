import { vi, describe, it, expect } from 'vitest'

vi.mock('../notification-generator', () => ({
  generateNotifications: vi.fn().mockResolvedValue({
    'user-1': [{ ref: 'user-1', message: 'Keep up your routine.', detector: 'StreakDetector', type: 'reminder' }]
  })
}))

vi.mock('../db/notifications', () => ({
  saveNotifications: vi.fn().mockResolvedValue([])
}))

vi.mock('../db/profiles', () => ({
  upsertProfile: vi.fn(),
  getAllProfiles: vi.fn().mockReturnValue([])
}))

process.env.LLM_API_KEY = 'test-key'

import { runPipeline } from '../core/pipeline'
import { DetectorBuilder } from '../detectors/detector-builder'
import { StreakDetector } from '../detectors/streak-detector'
import { generateNotifications } from '../notification-generator'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const builders = [
  new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 3 }))
    .addMarker('routine')
]

const userEvents = (userId: string, subcategory: string) => [
  { externalRef: userId, category: 'routine', subcategory, createdAt: daysAgo(6) },
  { externalRef: userId, category: 'routine', subcategory, createdAt: daysAgo(3) },
  { externalRef: userId, category: 'routine', subcategory, createdAt: daysAgo(0) },
]

describe('runPipeline', () => {
  it('returns findings keyed by userId', async () => {
    const result = await runPipeline(userEvents('user-1', 'handwash'), { builders })
    expect(result.count).toBeGreaterThan(0)
    expect(result.findings.filter(f => f.groupKey === 'user-1').length).toBeGreaterThan(0)
  })

  it('groups findings for all users when forUserId is not set', async () => {
    const events = [...userEvents('user-1', 'handwash'), ...userEvents('user-2', 'cleanup')]
    const result = await runPipeline(events, { builders })
    expect(result.findings.filter(f => f.groupKey === 'user-1').length).toBeGreaterThan(0)
    expect(result.findings.filter(f => f.groupKey === 'user-2').length).toBeGreaterThan(0)
  })

  it('forUserId scopes notification generation to that user only', async () => {
    const events = [...userEvents('user-1', 'handwash'), ...userEvents('user-2', 'cleanup')]
    const result = await runPipeline(events, { builders, forUserId: 'user-1' })
    expect(result.notificationsByUser['user-1']).toBeDefined()
    expect(result.notificationsByUser['user-2']).toBeUndefined()
  })

  it('falls back to ActivityPatternAnalyzer when no builders registered', async () => {
    const result = await runPipeline(userEvents('user-1', 'handwash'), { builders: [] })
    expect(result.count).toBeGreaterThan(0)
  })
})

describe('runPipeline — quota and collapsing', () => {
  it('default quota is 1 — only 1 finding per user passed to generateNotifications', async () => {
    const manyBuilders = [
      new DetectorBuilder(new StreakDetector({ name: 'streak-a', minRepeat: 3 })).addMarker('routine'),
      new DetectorBuilder(new StreakDetector({ name: 'streak-b', minRepeat: 3 })).addMarker('routine'),
      new DetectorBuilder(new StreakDetector({ name: 'streak-c', minRepeat: 3 })).addMarker('routine'),
    ]
    const events = userEvents('user-1', 'handwash')
    await runPipeline(events, { builders: manyBuilders })

    const calls = vi.mocked(generateNotifications).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].length).toBeLessThanOrEqual(1)
  })

  it('notificationsPerUser quota respected per user', async () => {
    const manyBuilders = [
      new DetectorBuilder(new StreakDetector({ name: 'streak-a', minRepeat: 3 })).addMarker('routine'),
      new DetectorBuilder(new StreakDetector({ name: 'streak-b', minRepeat: 3 })).addMarker('routine'),
      new DetectorBuilder(new StreakDetector({ name: 'streak-c', minRepeat: 3 })).addMarker('routine'),
    ]
    const events = [
      ...userEvents('user-1', 'handwash'),
      ...userEvents('user-2', 'handwash'),
    ]
    await runPipeline(events, { builders: manyBuilders, notificationsPerUser: 2 })

    const calls = vi.mocked(generateNotifications).mock.calls
    const lastCall = calls[calls.length - 1]
    // 2 users × max 2 findings each = max 4 total findings in batch
    expect(lastCall[0].length).toBeLessThanOrEqual(4)
  })

  it('same detector — collapsed to one finding per user', async () => {
    const builder = new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 3 }))
      .addMarker('routine')
    const events = userEvents('user-1', 'handwash')
    await runPipeline(events, { builders: [builder], notificationsPerUser: 10 })

    const calls = vi.mocked(generateNotifications).mock.calls
    const lastCall = calls[calls.length - 1]
    const detectors = lastCall[0].map((f: any) => f.detector)
    const uniqueDetectors = new Set(detectors)
    expect(detectors.length).toBe(uniqueDetectors.size)
  })

  it('makes a single LLM call regardless of user count', async () => {
    const builder = new DetectorBuilder(new StreakDetector({ name: 'routine-streak', minRepeat: 3 }))
      .addMarker('routine')
    const events = [
      ...userEvents('user-1', 'handwash'),
      ...userEvents('user-2', 'handwash'),
      ...userEvents('user-3', 'handwash'),
    ]
    vi.mocked(generateNotifications).mockClear()
    await runPipeline(events, { builders: [builder] })

    expect(vi.mocked(generateNotifications).mock.calls.length).toBe(1)
  })
})
