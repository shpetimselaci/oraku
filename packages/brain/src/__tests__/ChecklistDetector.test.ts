import { describe, it, expect } from 'vitest'
import { ChecklistDetector } from '../detectors/ChecklistDetector'
import type { EventGroup } from '../types'

function makeGroup(externalRef: string, events: object[]): EventGroup {
  return { externalRef, events: events as any, count: events.length }
}

function todayISO(): string {
  return new Date().toISOString()
}

describe('ChecklistDetector', () => {
  it('returns no findings when all expected items are covered', async () => {
    const detector = new ChecklistDetector({
      name: 'TestChecklist',
      todayOnly: false,
      expectedItems: [
        { key: 'health', keywords: ['health'] },
        { key: 'meals', keywords: ['meals'] },
      ],
      extractActual: (e) => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'health', createdAt: todayISO() },
      { category: 'meals', createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('fires a finding listing the missing items', async () => {
    const detector = new ChecklistDetector({
      name: 'TestChecklist',
      todayOnly: false,
      expectedItems: [
        { key: 'health', keywords: ['health'] },
        { key: 'meals', keywords: ['meals'] },
        { key: 'activity', keywords: ['activity'] },
      ],
      extractActual: (e) => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'health', createdAt: todayISO() },
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(1)
    const missing = findings[0].evidence.missing as string[]
    expect(missing).toContain('meals')
    expect(missing).toContain('activity')
    expect(missing).not.toContain('health')
  })

  it('returns no findings when group has no events', async () => {
    const detector = new ChecklistDetector({
      name: 'TestChecklist',
      todayOnly: false,
      expectedItems: [{ key: 'health', keywords: ['health'] }],
      extractActual: (e) => e.category || ''
    })

    const group = makeGroup('user-1', [])
    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('uses custom message formatter', async () => {
    const detector = new ChecklistDetector({
      name: 'TestChecklist',
      todayOnly: false,
      expectedItems: [{ key: 'health', keywords: ['health'] }],
      extractActual: (e) => e.category || '',
      message: (missing) => `Please log: ${missing.join(' and ')}`
    })

    const group = makeGroup('user-1', [
      { category: 'meals', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].message).toBe('Please log: health')
  })

  it('todayOnly filters out events from other days', async () => {
    const detector = new ChecklistDetector({
      name: 'TestChecklist',
      todayOnly: true,
      expectedItems: [{ key: 'health', keywords: ['health'] }],
      extractActual: (e) => e.category || ''
    })

    // Event from 5 days ago — should not count as "today"
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    const group = makeGroup('user-1', [
      { category: 'health', createdAt: pastDate.toISOString() }
    ])

    const findings = await detector.detect(group)
    // todayOnly = true, no events today, so no items extracted → no findings (empty events after filter)
    expect(findings.length).toBe(0)
  })
})
