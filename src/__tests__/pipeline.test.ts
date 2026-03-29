import { vi, describe, it, expect } from 'vitest'

vi.mock('../notificationGenerator', () => ({
  generateNotifications: vi.fn().mockResolvedValue([{
    ref: 'user-1',
    message: 'Keep up your routine.',
    detector: 'StreakDetector',
    type: 'reminder'
  }])
}))

vi.mock('../db/notifications', () => ({
  saveNotifications: vi.fn().mockResolvedValue([])
}))

process.env.LLM_API_KEY = 'test-key'

import { runPipeline } from '../core/pipeline'
import { DetectorBuilder } from '../detectors/DetectorBuilder'
import { StreakDetector } from '../detectors/StreakDetector'

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
