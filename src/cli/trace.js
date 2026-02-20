#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const InformationStitcher = require('../core/InformationStitcher')
const { stitchAndSave } = require('../ingest/index.js')

function usage() {
  console.log('Usage: node src/cli/trace.js --eventLine=<json> | --eventFile=<path> | --randomFrom=<path> --stitched=<path> [--groupBy=meta.userId] [--save]')
  process.exit(1)
}

function parseMaybeJson(text) {
  try { return JSON.parse(text) } catch (e) { return null }
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

async function loadRecordsFromFile(file) {
  const raw = fs.readFileSync(path.resolve(file), 'utf8')
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {}
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const out = []
  for (const l of lines) {
    try { out.push(JSON.parse(l)) } catch (e) {}
  }
  return out
}

function groupByDay(events) {
  const map = {}
  for (const e of events) {
    const d = e && e.createdAt ? new Date(e.createdAt).toISOString().slice(0,10) : 'unknown'
    if (!map[d]) map[d] = []
    map[d].push(e)
  }
  return map
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) usage()
  const options = {}
  for (const arg of args) {
    if (arg.startsWith('--eventLine=')) options.eventLine = arg.split('=')[1]
    if (arg.startsWith('--eventFile=')) options.eventFile = arg.split('=')[1]
    if (arg.startsWith('--randomFrom=')) options.randomFrom = arg.split('=')[1]
    if (arg.startsWith('--stitched=')) options.stitched = arg.split('=')[1]
    if (arg.startsWith('--groupBy=')) options.groupBy = arg.split('=')[1]
    if (arg === '--stitchUser') options.stitchUser = true
    if (arg === '--only-json') options.onlyJson = true
    if (arg === '--save') options.save = true
  }

  // obtain the event
  let event = null
  if (options.eventLine) event = parseMaybeJson(options.eventLine)
  if (!event && options.eventFile) {
    const rawContent = fs.readFileSync(path.resolve(options.eventFile), 'utf8')
    event = parseMaybeJson(rawContent) || (rawContent.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{ try{return JSON.parse(line)}catch(e){return null}}).filter(Boolean)[0])
  }
  if (!event && options.randomFrom) {
    const records = await loadRecordsFromFile(options.randomFrom)
    if (records.length === 0) { console.error('no records in', options.randomFrom); process.exit(1) }
    event = pickRandom(records)
  }
  if (!event) usage()

  // load stitched data or create empty
  let existingStitched = {}
  const stitchedPath = options.stitched || path.join(process.cwd(), 'output', 'stitched.json')
  if (fs.existsSync(stitchedPath)) {
    existingStitched = JSON.parse(fs.readFileSync(stitchedPath, 'utf8'))
  }

  // determine grouping field(s)
  let groupByFields = options.groupBy || ['externalRef','meta.userId','meta.user_id','userId','meta.externalRef']

  // use InformationStitcher to stitch the single event according to groupBy
  let eventsToStitch = [event]

  // If requested, find all events for the same user in the source file(s)
  if (options.stitchUser) {
    // determine source file to scan: prefer --randomFrom, else prefer JSON variant then NDJSON
    let sourceFilePath = options.randomFrom || path.join(process.cwd(), 'output', 'activity_events_2026-02-17T14-53-57-209Z.ndjson')
    const altJsonPath = sourceFilePath.replace(/\.ndjson$/, '.json')
    if (fs.existsSync(altJsonPath)) sourceFilePath = altJsonPath
    if (options.onlyJson) {
      // enforce JSON only: sourceFile must be .json and valid JSON
      if (!sourceFilePath.endsWith('.json')) {
        console.error('only-json specified but no JSON file found for source')
        process.exit(3)
      }
      // quick validation: attempt JSON.parse and fail if invalid
      const rawContent = fs.readFileSync(sourceFilePath, 'utf8')
      try { JSON.parse(rawContent) } catch (e) { console.error('JSON source invalid and --only-json specified'); process.exit(4) }
    }
    try {
      const allRecords = await loadRecordsFromFile(sourceFilePath)
      const userIdentifier = (event && event.meta && (event.meta.userId || event.meta.user_id)) || event.userId
      if (userIdentifier) {
        const matchedEvents = allRecords.filter(record => {
          if (!record) return false
          const uid = (record.meta && (record.meta.userId || record.meta.user_id)) || record.userId
          return uid === userIdentifier
        })
        if (matchedEvents.length > 0) eventsToStitch = matchedEvents
      }
    } catch (e) {
      // fallback to single event
      eventsToStitch = [event]
    }
    // ensure grouping targets userId
    if (!Array.isArray(options.groupBy)) options.groupBy = ['meta.userId']
    groupByFields = options.groupBy
  }

  const stitcher = new InformationStitcher(eventsToStitch, { groupBy: groupByFields })
  const stitchResult = stitcher.stitch()

  // merge into existing stitched dataset
  for (const [resultKey, value] of Object.entries(stitchResult)) {
    if (!existingStitched[resultKey]) {
      existingStitched[resultKey] = value
    } else {
      // merge via stitcher logic instead of manual mutation
      const mergedMap = new InformationStitcher([
        ...existingStitched[resultKey].events,
        ...value.events
      ], { groupBy: groupByFields }).stitch()
      existingStitched[resultKey] = mergedMap[resultKey]
    }
  }

  // optionally save stitched file
  if (options.save) {
    fs.mkdirSync(path.dirname(stitchedPath), { recursive: true })
    fs.writeFileSync(stitchedPath, JSON.stringify(existingStitched, null, 2))
  }

  // print only affected key (first result key)
  const resultKey = Object.keys(stitchResult)[0]
  const groupedByDay = groupByDay(existingStitched[resultKey].events)
  console.log(JSON.stringify({ key: resultKey, summary: { count: existingStitched[resultKey].count, first: existingStitched[resultKey].first, last: existingStitched[resultKey].last }, byDay: groupedByDay }, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
