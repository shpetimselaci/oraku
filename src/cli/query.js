#!/usr/bin/env node
const path = require('path')
const { stitchAndSave } = require('../ingest/index.js')
const { loadFromFile } = require('../core/dataLoader')
const { QueryEngine } = require('../core/queryEngine')

function usage() {
  console.log(
    'Usage: node src/cli/query.js --key=<id> [--file=output/stitched.json] [--stitchFile=<input.json> --groupBy=meta.userId]'
  )
  process.exit(1)
}

function parseArgs(argv) {
  const opts = {}
  for (const arg of argv) {
    const [flag, value] = arg.split('=')
    if (flag === '--key') opts.key = value
    if (flag === '--file') opts.file = value
    if (flag === '--stitchFile') opts.stitchFile = value
    if (flag === '--groupBy') opts.groupBy = value
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.key) usage()

  let stitchedPath = opts.file

  if (!stitchedPath && opts.stitchFile) {
    const outJson = path.join(process.cwd(), 'output', 'stitched.json')

    await stitchAndSave({
      filePath: opts.stitchFile,
      groupBy: opts.groupBy || 'externalRef',
      outJson,
      outMd: path.join(process.cwd(), 'output', 'stitched.md')
    })

    stitchedPath = outJson
  }

  if (!stitchedPath) {
    console.error('Either provide --file or --stitchFile')
    usage()
  }

  const data = await loadFromFile(stitchedPath)
  const engine = new QueryEngine(data)

  const entry = engine.getByKey(opts.key)

  if (!entry) {
    console.error('Key not found:', opts.key)
    console.log('Available keys (sample):', engine.getSampleKeys())
    process.exit(1)
  }

  console.log(JSON.stringify(entry, null, 2))
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
