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

async function loadJsonRecords(filePath: string): Promise<Event[]> {
  const abs = path.resolve(filePath)
  const raw = await fs.promises.readFile(abs, 'utf8')
  return parseEventRecords(raw)
}

function loadJsonRecordsSync(filePath: string): Event[] {
  const abs = path.resolve(filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return parseEventRecords(raw)
}

interface GroupAndExportOptions {
  filePath: string
  groupBy?: string | string[]
  outJson?: string
  outMd?: string
}

interface GroupAndExportResult {
  countGroups: number
  countRecords: number
}

async function groupAndExport(options: GroupAndExportOptions): Promise<GroupAndExportResult> {
  const {
    filePath,
    groupBy = 'externalRef',
    outJson = 'output/stitched.json',
    outMd = 'output/stitched.md'
  } = options

  const records = await loadJsonRecords(filePath)
  const stitcher = new EventStitcher(records)
  const stitched: EventGroupMap = stitcher.stitchByField(groupBy)

  fs.mkdirSync(path.dirname(path.resolve(outJson)), { recursive: true })
  fs.writeFileSync(path.resolve(outJson), JSON.stringify(stitched, null, 2))

  const keys = Object.keys(stitched).slice(0, 20)
  const mdBlocks = keys.map(k => stitcher.toMarkdown(stitched[k]))
  fs.writeFileSync(path.resolve(outMd), mdBlocks.join('\n\n---\n\n'))

  return { countGroups: Object.keys(stitched).length, countRecords: records.length }
}

export { loadJsonRecords, loadJsonRecordsSync, groupAndExport }
export type { GroupAndExportOptions, GroupAndExportResult }

if (require.main === module) {
  ;(async () => {
    const argv = process.argv.slice(2)
    const file = argv[0]
    if (!file) {
      console.error('Usage: node src/ingest/index.ts <file> [--groupBy=meta.userId] [--outJson=...] [--outMd=...]')
      process.exit(1)
    }
    const opts: Partial<GroupAndExportOptions> = {}
    for (const a of argv.slice(1)) {
      if (a.startsWith('--groupBy=')) opts.groupBy = a.split('=')[1]
      if (a.startsWith('--outJson=')) opts.outJson = a.split('=')[1]
      if (a.startsWith('--outMd=')) opts.outMd = a.split('=')[1]
    }
    try {
      const res = await groupAndExport({ filePath: file, ...opts })
      console.log('stitched', res)
    } catch (e) {
      console.error('error:', e)
      process.exit(1)
    }
  })()
}
