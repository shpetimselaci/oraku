const express = require('express')
const path = require('path')
const OrakuSDK = require('oraku-sdk').default
const { DetectorBuilder } = require('oraku-sdk')
const { generateEvents, DETECTORS } = require('./generate-events')

const app = express()
app.use(express.static(path.join(__dirname, 'public')))

const oraku = new OrakuSDK({
  apiUrl: 'http://localhost:3000',
  apiKey: 'test-key-123',
  notificationsPerUser: 10
})

let events = []
let detectorTypeMap = {}

// groups events by externalRef — each unique externalRef is a user
function extractUsers(events) {
  const seen = new Map()
  for (const e of events) {
    const id = e.externalRef
    if (!id || seen.has(id)) continue
    seen.set(id, {
      id,
      label: e.meta?.username ?? id,
      org: e.meta?.organizationName ?? ''
    })
  }
  return [...seen.values()]
}

// converts a plain detector config object into a DetectorBuilder
function configToBuilder(config) {
  const b = new DetectorBuilder(config.name, config.type)
  if (config.marker)             b.addMarker(config.marker)
  if (config.minRepeat)          b.minRepeat(config.minRepeat)
  if (config.notificationType)   b.notificationType(config.notificationType)
  if (config.expected)           b.expected(config.expected)
  if (config.todayOnly)          b.todayOnly()
  if (config.extract)            b.extract(config.extract)
  if (config.operator)           b.operator(config.operator)
  if (config.value !== undefined) b.value(config.value)
  if (config.aggregate)          b.aggregate(config.aggregate)
  if (config.lookup)             b.lookup({ map: config.lookup })
  if (config.targets)            b.targets(config.targets)
  if (config.scheduleAt)         b.scheduleAt(config.scheduleAt)
  return b
}

// poll endpoint — returns whatever the scheduler last computed, no pipeline run triggered
app.get('/api/latest', async (req, res) => {
  try {
    const apiRes = await fetch('http://localhost:3000/notifications/latest', {
      headers: { 'x-api-key': 'test-key-123' }
    })
    if (apiRes.status === 404) { res.json({ ok: false, empty: true }); return }
    if (!apiRes.ok) throw new Error(`API error: ${apiRes.status}`)

    const data = await apiRes.json()
    const users = extractUsers(events).map(user => ({
      ...user,
      notifications: (data.notificationsByUser?.[user.id] ?? []).slice(0, 5),
      findingMeta: (data.findingMetaByUser?.[user.id] ?? [])
    }))

    res.json({ ok: true, timestamp: data.runTimestamp ?? null, nextRun: data.nextRun, users, detectorTypes: detectorTypeMap })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// register detectors and ingest events
async function seed() {
  events = generateEvents()

  const detectorList = DETECTORS.map(configToBuilder)
  for (const d of detectorList) await oraku.detectors.add(d)

  detectorTypeMap = {}
  for (const config of DETECTORS) {
    detectorTypeMap[config.name] = config.type
  }

  await oraku.consume(events).generate()
  console.log(`[dashboard] Seeded ${extractUsers(events).length} users, ${detectorList.length} detectors`)
}

async function ingest() {
  events = generateEvents()
  await oraku.consume(events).generate()
  console.log(`[dashboard] Ingested fresh events for ${extractUsers(events).length} users`)
}

app.listen(4000, () => {
  console.log('Oraku dashboard running at http://localhost:4000')
  setTimeout(async function trySeed() {
    try {
      await seed()
      setInterval(ingest, 1 * 60 * 60 * 1000)
    } catch (err) {
      console.error('[dashboard] Seed failed, retrying in 5s:', err.message)
      setTimeout(trySeed, 5000)
    }
  }, 3000)
})
