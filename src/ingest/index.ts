import fs from 'fs'
import path from 'path'
import { EventStitcher } from '../core/EventStitcher'
import type { Event, EventGroupMap } from '../types'

function parseEventRecords(raw: string): Event[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Event[]
  } catch (_e) {}
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const out: Event[] = []
  for (const l of lines) {
    try { out.push(JSON.parse(l) as Event) } catch (_e) {}
  }
  return out
}

async function loadEvents(filePath: string): Promise<Event[]> {
  const abs = path.resolve(filePath)
  const raw = await fs.promises.readFile(abs, 'utf8')
  return parseEventRecords(raw)
}

function loadEventsSync(filePath: string): Event[] {
  const abs = path.resolve(filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return parseEventRecords(raw)
}

function stitch(events: Event[]): EventGroupMap {
  return new EventStitcher(events).stitch()
}

function writeGroups(
  groups: EventGroupMap,
  outJson = 'output/stitched.json',
  outMd = 'output/stitched.md'
): void {
  const stitcher = new EventStitcher([])
  fs.mkdirSync(path.dirname(path.resolve(outJson)), { recursive: true })
  fs.writeFileSync(path.resolve(outJson), JSON.stringify(groups, null, 2))

  const keys = Object.keys(groups).slice(0, 20)
  const mdBlocks = keys.map(k => stitcher.toMarkdown(groups[k]))
  fs.writeFileSync(path.resolve(outMd), mdBlocks.join('\n\n---\n\n'))
}

export { loadEvents, loadEventsSync, stitch, writeGroups }

if (require.main === module) {
  ;(async () => {
    const argv = process.argv.slice(2)
    const file = argv[0]
    if (!file) {
      console.error('Usage: node src/ingest/index.ts <file> [--outJson=...] [--outMd=...]')
      process.exit(1)
    }
    let outJson: string | undefined
    let outMd: string | undefined
    for (const a of argv.slice(1)) {
      if (a.startsWith('--outJson=')) outJson = a.split('=')[1]
      if (a.startsWith('--outMd=')) outMd = a.split('=')[1]
    }
    try {
      const events = await loadEvents(file)
      const groups = stitch(events)
      writeGroups(groups, outJson, outMd)
      console.log('stitched', { countGroups: Object.keys(groups).length, countRecords: events.length })
    } catch (e) {
      console.error('error:', e)
      process.exit(1)
    }
  })()
}
