import { describe, it, expect } from 'vitest'
import { MilestoneDetector } from '../detectors/MilestoneDetector'
import type { EventGroup } from '../types'

function makeGroup(externalRef: string, events: object[]): EventGroup {
  return { externalRef, events: events as any, count: events.length }
}

function todayISO(): string {
  return new Date().toISOString()
}

describe('MilestoneDetector', () => {
  it('fires a finding for each achieved milestone', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [
        { key: 'first-purchase', keywords: ['first-purchase'] },
        { key: 'profile-complete', keywords: ['profile-complete'] },
        { key: 'onboarding', keywords: ['onboarding'] }
      ],
      extractActual: e => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'first-purchase', createdAt: todayISO() },
      { category: 'onboarding', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(2)
    const keys = findings.map(f => f.evidence.milestone)
    expect(keys).toContain('first-purchase')
    expect(keys).toContain('onboarding')
    expect(keys).not.toContain('profile-complete')
  })

  it('returns no findings when no milestones are matched', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [{ key: 'first-purchase', keywords: ['first-purchase'] }],
      extractActual: e => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'login', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('returns no findings when group has no events', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [{ key: 'onboarding', keywords: ['onboarding'] }],
      extractActual: e => e.category || ''
    })

    const findings = await detector.detect(makeGroup('user-1', []))
    expect(findings.length).toBe(0)
  })

  it('marks findings as permanent', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [{ key: 'onboarding', keywords: ['onboarding'] }],
      extractActual: e => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'onboarding', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].evidence.permanent).toBe(true)
  })

  it('uses custom message formatter', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [{ key: 'onboarding', keywords: ['onboarding'] }],
      extractActual: e => e.category || '',
      message: achieved => `You unlocked: ${achieved.join(', ')}`
    })

    const group = makeGroup('user-1', [
      { category: 'onboarding', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].message).toBe('You unlocked: onboarding')
  })

  it('todayOnly filters out past events', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: true,
      milestones: [{ key: 'onboarding', keywords: ['onboarding'] }],
      extractActual: e => e.category || ''
    })

    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    const group = makeGroup('user-1', [
      { category: 'onboarding', createdAt: pastDate.toISOString() }
    ])

    const findings = await detector.detect(group)
    expect(findings.length).toBe(0)
  })

  it('severity defaults to success', async () => {
    const detector = new MilestoneDetector({
      name: 'TestMilestone',
      todayOnly: false,
      milestones: [{ key: 'onboarding', keywords: ['onboarding'] }],
      extractActual: e => e.category || ''
    })

    const group = makeGroup('user-1', [
      { category: 'onboarding', createdAt: todayISO() }
    ])

    const findings = await detector.detect(group)
    expect(findings[0].severity).toBe('success')
  })
})
