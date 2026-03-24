import path from 'path'
import { groupAndExport } from '../ingest/index'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: stitch <file> [--groupBy=path] [--outJson=path] [--outMd=path]')
    process.exit(0)
  }
  const inputFile = args[0]
  const options: { groupBy?: string; outJson?: string; outMd?: string } = {}
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--groupBy=')) options.groupBy = arg.split('=')[1]
    if (arg.startsWith('--outJson=')) options.outJson = arg.split('=')[1]
    if (arg.startsWith('--outMd=')) options.outMd = arg.split('=')[1]
  }
  const result = await groupAndExport({
    filePath: path.resolve(inputFile),
    groupBy: options.groupBy,
    outJson: options.outJson,
    outMd: options.outMd
  })
  console.log('done:', result)
}

main().catch(err => { console.error(err); process.exit(1) })
