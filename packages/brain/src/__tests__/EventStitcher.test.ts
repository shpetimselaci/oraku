import { describe, it, expect } from 'vitest'
import { EventStitcher } from '../core/EventStitcher'

describe('EventStitcher', () => {
  it('groups events by externalRef', () => {
    const events = [
      { externalRef: 'user-1', category: 'health', createdAt: '2026-03-01T09:00:00Z' },
      { externalRef: 'user-1', category: 'meals', createdAt: '2026-03-01T12:00:00Z' },
      { externalRef: 'user-2', category: 'health', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const result = new EventStitcher(events).stitch()

    expect(Object.keys(result)).toHaveLength(2)
    expect(result['user-1'].events).toHaveLength(2)
    expect(result['user-2'].events).toHaveLength(1)
  })

  it('skips events without externalRef', () => {
    const events = [
      { category: 'health', createdAt: '2026-03-01T09:00:00Z' },
      { externalRef: 'user-1', category: 'meals', createdAt: '2026-03-01T12:00:00Z' },
    ]

    const result = new EventStitcher(events).stitch()

    expect(Object.keys(result)).toHaveLength(1)
    expect(result['user-1'].events).toHaveLength(1)
  })

  it('tracks first and last timestamps correctly', () => {
    const events = [
      { externalRef: 'user-1', category: 'health', createdAt: '2026-03-05T09:00:00Z' },
      { externalRef: 'user-1', category: 'meals', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const result = new EventStitcher(events).stitch()

    expect(result['user-1'].first).toBe('2026-03-01T09:00:00.000Z')
    expect(result['user-1'].last).toBe('2026-03-05T09:00:00.000Z')
  })

  it('sets externalRef on each group', () => {
    const events = [
      { externalRef: 'user-1', category: 'health', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const result = new EventStitcher(events).stitch()

    expect(result['user-1'].externalRef).toBe('user-1')
  })

  it('returns empty map when no events have externalRef', () => {
    const events = [
      { category: 'health', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const result = new EventStitcher(events).stitch()

    expect(Object.keys(result)).toHaveLength(0)
  })
})
