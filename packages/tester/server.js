require('dotenv').config()

const express = require('express')
const path = require('path')
const fs = require('fs')
const OrakuSDK = require('oraku-sdk').default
const { DetectorBuilder } = require('oraku-sdk')
const { generateEvents, DETECTORS } = require('./generate-events')

const API_URL = 'http://localhost:3000'
const TESTER_URL = 'http://localhost:4000'
const ORG_NAME = 'Sunshine Daycare'

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

let oraku = null
let events = []
let detectorTypeMap = {}

function buildSDK(apiKey) {
  return new OrakuSDK({ apiUrl: API_URL, apiKey })
}

function configToBuilder(config) {
  const b = new DetectorBuilder(config.name, config.type)
  if (config.marker)              b.addMarker(config.marker)
  if (config.minRepeat)           b.minRepeat(config.minRepeat)
  if (config.notificationType)    b.notificationType(config.notificationType)
  if (config.expected)            b.expected(config.expected)
  if (config.todayOnly)           b.todayOnly()
  if (config.extract)             b.extract(config.extract)
  if (config.operator)            b.operator(config.operator)
  if (config.value !== undefined) b.value(config.value)
  if (config.aggregate)           b.aggregate(config.aggregate)
  if (config.lookup)              b.lookup({ map: config.lookup })
  if (config.targets)             b.targets(config.targets)
  if (config.scheduleAt)          b.scheduleAt(config.scheduleAt)
  return b
}

function extractUsers(events) {
  const seen = new Map()
  for (const e of events) {
    const id = e.externalRef
    if (!id || seen.has(id)) continue
    seen.set(id, { id, label: e.meta?.username ?? id, org: e.meta?.organizationName ?? '' })
  }
  return [...seen.values()]
}

app.get('/api/latest', async (req, res) => {
  if (!oraku) { res.json({ ok: false, empty: true }); return }
  try {
    const apiRes = await fetch(`${API_URL}/notifications/latest`, {
      headers: { 'x-api-key': process.env.ORAKU_API_KEY }
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

app.post('/api/seed', async (req, res) => {
  try {
    await seed()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// receives the key from admin approval
app.post('/webhook/registration', async (req, res) => {
  const { approved, key } = req.body
  res.json({ ok: true })

  if (!approved) {
    console.log('[tester] Registration was rejected by admin')
    return
  }

  console.log('[tester] Approved! Saving key and starting...')
  const envPath = path.join(__dirname, '.env')
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  const updated = existing.replace(/^ORAKU_API_KEY=.*/m, '').trim()
  fs.writeFileSync(envPath, (updated ? updated + '\n' : '') + `ORAKU_API_KEY=${key}\n`)
  process.env.ORAKU_API_KEY = key

  oraku = buildSDK(key)
  await seed()
  setInterval(ingest, 60 * 60 * 1000)
})

async function seed() {
  events = generateEvents()
  const detectorList = DETECTORS.map(configToBuilder)
  for (const d of detectorList) await oraku.detectors.add(d)
  detectorTypeMap = {}
  for (const config of DETECTORS) detectorTypeMap[config.name] = config.type
  await oraku.consume(events).generate()
  console.log(`[tester] Seeded ${extractUsers(events).length} users, ${detectorList.length} detectors`)
}

async function ingest() {
  events = generateEvents()
  await oraku.consume(events).generate()
  console.log(`[tester] Ingested fresh events for ${extractUsers(events).length} users`)
}

app.listen(4000, async () => {
  console.log('[tester] Running at http://localhost:4000')

  // if key already saved, start immediately
  if (process.env.ORAKU_API_KEY) {
    console.log('[tester] Found existing API key — starting...')
    oraku = buildSDK(process.env.ORAKU_API_KEY)
    setTimeout(async function trySeed() {
      try {
        await seed()
        setInterval(ingest, 60 * 60 * 1000)
      } catch (err) {
        console.error('[tester] Seed failed, retrying in 5s:', err.message)
        setTimeout(trySeed, 5000)
      }
    }, 3000)
    return
  }

  // otherwise register and wait for admin approval
  console.log(`[tester] No API key found — registering "${ORG_NAME}" and waiting for admin approval...`)
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ORG_NAME, webhookUrl: `${TESTER_URL}/webhook/registration` })
    })
    const data = await res.json()
    if (res.status === 409) {
      console.log('[tester] Registration already pending — waiting for admin to approve at http://localhost:3000/admin')
    } else if (res.ok) {
      console.log('[tester] Registration submitted — go to http://localhost:3000/admin to approve')
    } else {
      console.error('[tester] Registration failed:', data.error)
    }
  } catch (err) {
    console.error('[tester] Could not reach API:', err.message)
  }
})
