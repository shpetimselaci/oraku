import path from 'path'
import { loadEvents, stitch, writeGroups } from '../ingest/index'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: stitch <file> [--outJson=path] [--outMd=path]')
    process.exit(0)
  }
  const inputFile = args[0]
  let outJson: string | undefined
  let outMd: string | undefined
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--outJson=')) outJson = arg.split('=')[1]
    if (arg.startsWith('--outMd=')) outMd = arg.split('=')[1]
  }
  const events = await loadEvents(path.resolve(inputFile))
  const groups = stitch(events)
  writeGroups(groups, outJson, outMd)
  console.log('done:', { countGroups: Object.keys(groups).length, countRecords: events.length })
}

main().catch(err => { console.error(err); process.exit(1) })
