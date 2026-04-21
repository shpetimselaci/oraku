import { vi, describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('../db/connection', () => ({ db: new Database(':memory:') }))

import { db as testDb } from '../db/connection'
import { initSchema } from '../db/schema'
import { getDueNotifications } from '../db/notifications'

beforeAll(() => {
  initSchema()
})

describe('getDueNotifications', () => {
  it('returns due notifications ordered by scheduled_at ASC', () => {
    testDb.exec(`
      INSERT INTO notifications (id, user_id, message, type, scheduled_at, generated_date)
      VALUES
        ('n3', 'u1', 'third',  'reminder', '2026-01-03T00:00:00', '2026-01-03'),
        ('n1', 'u1', 'first',  'reminder', '2026-01-01T00:00:00', '2026-01-01'),
        ('n2', 'u1', 'second', 'reminder', '2026-01-02T00:00:00', '2026-01-02')
    `)

    const results = getDueNotifications()
    const messages = results.filter(n => ['first', 'second', 'third'].includes(n.message)).map(n => n.message)
    expect(messages).toEqual(['first', 'second', 'third'])
  })

  it('excludes already delivered notifications', () => {
    testDb.exec(`
      INSERT INTO notifications (id, user_id, message, type, scheduled_at, generated_date, delivered_at)
      VALUES ('n4', 'u1', 'delivered', 'reminder', '2026-01-01T00:00:00', '2026-01-04', '2026-01-01T01:00:00')
    `)

    const results = getDueNotifications()
    expect(results.find(n => n.message === 'delivered')).toBeUndefined()
  })

  it('excludes future-scheduled notifications', () => {
    testDb.exec(`
      INSERT INTO notifications (id, user_id, message, type, scheduled_at, generated_date)
      VALUES ('n5', 'u1', 'future', 'reminder', '2099-01-01T00:00:00', '2099-01-01')
    `)

    const results = getDueNotifications()
    expect(results.find(n => n.message === 'future')).toBeUndefined()
  })
})
