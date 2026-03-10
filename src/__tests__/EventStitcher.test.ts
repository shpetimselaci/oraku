import { describe, it, expect } from 'vitest'
import { EventStitcher } from '../core/EventStitcher'

describe('EventStitcher', () => {
  it('groups events by a top-level field', () => {
    // Each event has a unique externalRef (event ID), grouped by meta.userId
    const events = [
      { externalRef: 'evt-1', meta: { userId: 'user-1' }, category: 'health', createdAt: '2026-03-01T09:00:00Z' },
      { externalRef: 'evt-2', meta: { userId: 'user-1' }, category: 'meals', createdAt: '2026-03-01T12:00:00Z' },
      { externalRef: 'evt-3', meta: { userId: 'user-2' }, category: 'health', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(Object.keys(result)).toHaveLength(2)
    expect(result['user-1'].events).toHaveLength(2)
    expect(result['user-2'].events).toHaveLength(1)
  })

  it('groups events by a nested field (meta.userId)', () => {
    const events = [
      { meta: { userId: 'alice' }, category: 'health', createdAt: '2026-03-01T09:00:00Z', externalRef: 'evt-1' },
      { meta: { userId: 'alice' }, category: 'meals', createdAt: '2026-03-01T12:00:00Z', externalRef: 'evt-2' },
      { meta: { userId: 'bob' }, category: 'health', createdAt: '2026-03-01T09:00:00Z', externalRef: 'evt-3' },
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(Object.keys(result)).toHaveLength(2)
    expect(result['alice'].events).toHaveLength(2)
    expect(result['bob'].events).toHaveLength(1)
  })

  it('deduplicates events with the same externalRef', () => {
    const events = [
      { externalRef: 'evt-1', meta: { userId: 'alice' }, category: 'health', createdAt: '2026-03-01T09:00:00Z' },
      { externalRef: 'evt-1', meta: { userId: 'alice' }, category: 'health', createdAt: '2026-03-01T09:00:00Z' }, // duplicate
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(result['alice'].events).toHaveLength(1)
    expect(result['alice'].count).toBe(1)
  })

  it('groups into "unknown" when field is missing', () => {
    const events = [
      { category: 'health', createdAt: '2026-03-01T09:00:00Z', externalRef: 'evt-1' },
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(result['unknown']).toBeDefined()
    expect(result['unknown'].events).toHaveLength(1)
  })

  it('tracks first and last timestamps correctly', () => {
    const events = [
      { externalRef: 'evt-1', meta: { userId: 'user-1' }, category: 'health', createdAt: '2026-03-05T09:00:00Z' },
      { externalRef: 'evt-2', meta: { userId: 'user-2' }, category: 'meals', createdAt: '2026-03-01T09:00:00Z' },
      { externalRef: 'evt-3', meta: { userId: 'user-1' }, category: 'meals', createdAt: '2026-03-01T09:00:00Z' },
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(result['user-1'].first).toBe('2026-03-01T09:00:00.000Z')
    expect(result['user-1'].last).toBe('2026-03-05T09:00:00.000Z')
  })

  it('sets externalRef on each group to the key value', () => {
    const events = [
      { meta: { userId: 'charlie' }, category: 'health', createdAt: '2026-03-01T09:00:00Z', externalRef: 'evt-1' },
    ]

    const stitcher = new EventStitcher(events)
    const result = stitcher.stitchByField('meta.userId')

    expect(result['charlie'].externalRef).toBe('charlie')
  })
})
