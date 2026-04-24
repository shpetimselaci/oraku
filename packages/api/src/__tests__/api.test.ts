import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'

vi.mock('@oraku/brain/src/core/pipeline', () => ({
  runPipeline: vi.fn()
}))

import { runPipeline } from '@oraku/brain/src/core/pipeline'
import { app } from '../index'

const mockRunPipeline = vi.mocked(runPipeline)

const API_KEY = 'test-key-123'
const headers = { 'x-api-key': API_KEY }

const mockFinding = {
  id: 'recurring-user-1-routine_handwash',
  detector: 'ActivityPatternAnalyzer',
  notificationType: 'insight' as const,
  message: 'Predicted next routine/handwash: 2026-03-17',
  groupKey: 'user-1',
  evidence: {
    predicted: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    events: [{ ref: 'e1', date: new Date().toISOString() }]
  },
  createdAt: new Date().toISOString()
}

const mockNotification = { ref: 'user-1', message: 'Keep up your routine!', detector: 'StreakDetector', type: 'reminder' }

const mockPipelineResult = {
  count: 1,
  findings: [mockFinding],
  notifications: [mockNotification],
  notificationsByUser: { 'user-1': [mockNotification] }
}

beforeEach(() => {
  mockRunPipeline.mockResolvedValue(mockPipelineResult)
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('POST /ingest', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).post('/ingest').send({ events: [] })
    expect(res.status).toBe(401)
  })

  it('returns 400 when events is not an array', async () => {
    const res = await request(app).post('/ingest').set(headers).send({ events: 'bad' })
    expect(res.status).toBe(400)
  })

  it('runs pipeline and returns count', async () => {
    const events = [{ externalRef: 'e1', category: 'routine', meta: { userId: 'user-1' }, createdAt: new Date().toISOString() }]
    const res = await request(app).post('/ingest').set(headers).send({ events })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.count).toBe(1)
    expect(mockRunPipeline).toHaveBeenCalledWith(events, expect.objectContaining({ builders: expect.any(Array) }))
  })

  it('auto-registers new categories found in events', async () => {
    const events = [
      { externalRef: 'e1', category: 'fitness', meta: { userId: 'user-1' }, createdAt: new Date().toISOString() }
    ]
    await request(app).post('/ingest').set({ 'x-api-key': 'auto-reg-key' }).send({ events })
    const lastCall = mockRunPipeline.mock.calls.at(-1) as any
    expect((lastCall[1].builders ?? []).length).toBeGreaterThan(0)
  })

  it('does not duplicate auto-registered categories on repeated ingest', async () => {
    const key = 'dedup-key'
    const events = [{ externalRef: 'e1', category: 'wellness', meta: { userId: 'user-1' }, createdAt: new Date().toISOString() }]
    await request(app).post('/ingest').set({ 'x-api-key': key }).send({ events })
    const countAfterFirst = (mockRunPipeline.mock.calls.at(-1) as any)[1].builders.length
    await request(app).post('/ingest').set({ 'x-api-key': key }).send({ events })
    const countAfterSecond = (mockRunPipeline.mock.calls.at(-1) as any)[1].builders.length
    expect(countAfterSecond).toBe(countAfterFirst)
  })

  it('passes registered detectors as builders to the pipeline', async () => {
    const key = 'detector-ingest-key'
    await request(app).post('/detectors').set({ 'x-api-key': key }).send({
      name: 'gym-streak', type: 'streak-ongoing', marker: 'fitness', minRepeat: 3
    })
    await request(app).post('/ingest').set({ 'x-api-key': key }).send({ events: [{}] })
    const lastCall = mockRunPipeline.mock.calls.at(-1) as any
    expect(lastCall[1].builders.length).toBeGreaterThan(0)
  })
})

describe('POST /ingest — pull mode', () => {
  const events = [{ externalRef: 'user-1', category: 'routine', createdAt: new Date().toISOString() }]

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a url and fetches events from it (array response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => events
    }))

    const res = await request(app).post('/ingest').set(headers).send({ url: 'https://example.com/events' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockRunPipeline).toHaveBeenCalledWith(events, expect.any(Object))
  })

  it('accepts a url and fetches events from it (wrapped response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events })
    }))

    const res = await request(app).post('/ingest').set(headers).send({ url: 'https://example.com/events' })
    expect(res.status).toBe(200)
    expect(mockRunPipeline).toHaveBeenCalledWith(events, expect.any(Object))
  })

  it('returns 400 when url fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const res = await request(app).post('/ingest').set(headers).send({ url: 'https://example.com/events' })
    expect(res.status).toBe(400)
  })

  it('accepts sources and merges events from multiple arrays', async () => {
    const eventsA = [{ externalRef: 'user-1', category: 'routine', createdAt: new Date().toISOString() }]
    const eventsB = [{ externalRef: 'user-2', category: 'fitness', createdAt: new Date().toISOString() }]

    const res = await request(app).post('/ingest').set(headers).send({
      sources: [{ events: eventsA }, { events: eventsB }]
    })
    expect(res.status).toBe(200)
    expect(mockRunPipeline).toHaveBeenCalledWith([...eventsA, ...eventsB], expect.any(Object))
  })

  it('accepts sources and fetches from url sources', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => events
    }))

    const res = await request(app).post('/ingest').set(headers).send({
      sources: [{ url: 'https://example.com/events' }]
    })
    expect(res.status).toBe(200)
    expect(mockRunPipeline).toHaveBeenCalledWith(events, expect.any(Object))
  })

  it('accepts sources mixing arrays and urls', async () => {
    const eventsA = [{ externalRef: 'user-1', category: 'routine', createdAt: new Date().toISOString() }]
    const eventsB = [{ externalRef: 'user-2', category: 'fitness', createdAt: new Date().toISOString() }]

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => eventsB
    }))

    const res = await request(app).post('/ingest').set(headers).send({
      sources: [{ events: eventsA }, { url: 'https://example.com/events' }]
    })
    expect(res.status).toBe(200)
    expect(mockRunPipeline).toHaveBeenCalledWith([...eventsA, ...eventsB], expect.any(Object))
  })

  it('returns 400 when body has none of events, url, or sources', async () => {
    const res = await request(app).post('/ingest').set(headers).send({ something: 'else' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when resolved events are empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    }))

    const res = await request(app).post('/ingest').set(headers).send({ url: 'https://example.com/empty' })
    expect(res.status).toBe(400)
  })

  it('produces the same result whether events are pushed directly or fetched from a url', async () => {
    const sharedEvents = [{ externalRef: 'user-1', category: 'routine', createdAt: new Date().toISOString() }]

    // push mode
    const pushRes = await request(app)
      .post('/ingest')
      .set({ 'x-api-key': 'parity-key-push' })
      .send({ events: sharedEvents })
    expect(pushRes.status).toBe(200)
    const pushCall = mockRunPipeline.mock.calls.at(-1)!

    // url mode — same events returned from fetch
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sharedEvents
    }))
    const urlRes = await request(app)
      .post('/ingest')
      .set({ 'x-api-key': 'parity-key-url' })
      .send({ url: 'https://example.com/events' })
    expect(urlRes.status).toBe(200)
    const urlCall = mockRunPipeline.mock.calls.at(-1)!

    // same events passed to the pipeline in both cases
    expect(urlCall[0]).toEqual(pushCall[0])

    // same shape response
    expect(urlRes.body.ok).toBe(pushRes.body.ok)
    expect(urlRes.body.count).toBe(pushRes.body.count)
  })
})

describe('GET /notifications', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).get('/notifications')
    expect(res.status).toBe(401)
  })

  it('returns 404 before any ingest', async () => {
    const res = await request(app).get('/notifications').set({ 'x-api-key': 'never-ingested' })
    expect(res.status).toBe(404)
  })

  it('returns notifications after ingest', async () => {
    await request(app).post('/ingest').set(headers).send({ events: [{}] })
    const res = await request(app).get('/notifications').set(headers)
    expect(res.status).toBe(200)
    expect(res.body.notifications).toHaveLength(1)
    expect(res.body.notifications[0].message).toBe('Keep up your routine!')
    expect(res.body.count).toBe(1)
  })

  it('filters by externalRef when provided', async () => {
    await request(app).post('/ingest').set(headers).send({ events: [{}] })
    const res = await request(app).get('/notifications').set(headers).query({ externalRef: 'user-1' })
    expect(res.body.notifications[0].message).toBe('Keep up your routine!')
  })

  it('limits results when limit is provided', async () => {
    mockRunPipeline.mockResolvedValueOnce({
      ...mockPipelineResult,
      notifications: [
        { ref: 'user-1', message: 'Notif 1', detector: 'X', type: 'reminder' },
        { ref: 'user-1', message: 'Notif 2', detector: 'X', type: 'reminder' },
        { ref: 'user-1', message: 'Notif 3', detector: 'X', type: 'reminder' }
      ]
    })
    await request(app).post('/ingest').set({ 'x-api-key': 'limit-key' }).send({ events: [{}] })
    const res = await request(app).get('/notifications').set({ 'x-api-key': 'limit-key' }).query({ limit: 2 })
    expect(res.body.notifications).toHaveLength(2)
    expect(res.body.notifications.map((n: { message: string }) => n.message)).toEqual(['Notif 1', 'Notif 2'])
  })
})

describe('GET /notifications/latest', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).get('/notifications/latest')
    expect(res.status).toBe(401)
  })

  it('returns 404 before any ingest', async () => {
    const res = await request(app).get('/notifications/latest').set({ 'x-api-key': 'never-ingested-2' })
    expect(res.status).toBe(404)
  })

  it('returns notificationsByUser and findingMetaByUser after ingest', async () => {
    await request(app).post('/ingest').set(headers).send({ events: [{}] })
    const res = await request(app).get('/notifications/latest').set(headers)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.notificationsByUser['user-1'][0].message).toBe('Keep up your routine!')
    expect(res.body.findingMetaByUser['user-1']).toBeDefined()
  })

  it('returns nextRun when findings contain a predicted time', async () => {
    await request(app).post('/ingest').set(headers).send({ events: [{}] })
    const res = await request(app).get('/notifications/latest').set(headers)
    expect(res.body.nextRun).toBeDefined()
    expect(typeof res.body.nextRun).toBe('string')
  })

  it('returns runTimestamp after ingest', async () => {
    await request(app).post('/ingest').set({ 'x-api-key': 'ts-key' }).send({ events: [{}] })
    const res = await request(app).get('/notifications/latest').set({ 'x-api-key': 'ts-key' })
    expect(res.body.runTimestamp).toBeDefined()
  })
})

describe('GET /schedule', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).get('/schedule')
    expect(res.status).toBe(401)
  })

  it('returns null nextRun before any ingest', async () => {
    const res = await request(app).get('/schedule').set({ 'x-api-key': 'no-schedule-key' })
    expect(res.status).toBe(200)
    expect(res.body.nextRun).toBeNull()
    expect(res.body.nextPredicted).toBeNull()
  })

  it('returns nextRun and nextPredicted after ingest with a predicted finding', async () => {
    await request(app).post('/ingest').set({ 'x-api-key': 'schedule-key' }).send({ events: [{}] })
    const res = await request(app).get('/schedule').set({ 'x-api-key': 'schedule-key' })
    expect(res.status).toBe(200)
    expect(typeof res.body.nextPredicted).toBe('string')
    expect(typeof res.body.nextRun).toBe('string')
  })
})

describe('POST /detectors', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).post('/detectors').send({ name: 'test', type: 'streak-ongoing' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name or type is missing', async () => {
    const res = await request(app).post('/detectors').set(headers).send({ name: 'test' })
    expect(res.status).toBe(400)
  })

  it('registers a detector and returns count', async () => {
    const res = await request(app).post('/detectors').set(headers).send({
      name: 'routine-streak', type: 'streak-ongoing', marker: 'routine', minRepeat: 3, severity: 'info'
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.registered).toBeGreaterThan(0)
  })

  it('replacing an existing detector by name does not increase count', async () => {
    const key = 'replace-key'
    await request(app).post('/detectors').set({ 'x-api-key': key }).send({ name: 'my-detector', type: 'streak-ongoing' })
    const first = await request(app).post('/detectors').set({ 'x-api-key': key }).send({ name: 'my-detector', type: 'streak-break' })
    const second = await request(app).post('/detectors').set({ 'x-api-key': key }).send({ name: 'my-detector', type: 'checklist' })
    expect(second.body.registered).toBe(first.body.registered)
  })
})

describe('DELETE /detectors/:name', () => {
  it('returns 401 when api key is missing', async () => {
    const res = await request(app).delete('/detectors/some-name')
    expect(res.status).toBe(401)
  })

  it('removes a registered detector', async () => {
    await request(app).post('/detectors').set(headers).send({ name: 'to-delete', type: 'streak-ongoing' })
    const res = await request(app).delete('/detectors/to-delete').set(headers)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns ok even when detector does not exist', async () => {
    const res = await request(app).delete('/detectors/nonexistent').set(headers)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

