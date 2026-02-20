const fs = require('fs')
const path = require('path')
const InformationStitcher = require('../core/InformationStitcher')

function parseJsonOrNdjson(raw) {
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

async function loadJsonRecords(filePath) {
  const abs = path.resolve(filePath)
  const raw = await fs.promises.readFile(abs, 'utf8')
  return parseJsonOrNdjson(raw)
}

function loadJsonRecordsSync(filePath) {
  const abs = path.resolve(filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  return parseJsonOrNdjson(raw)
}

async function stitchAndSave(options) {
  const { filePath, groupBy = 'externalRef', outJson = 'output/stitched.json', outMd = 'output/stitched.md' } = options
  const records = await loadJsonRecords(filePath)
  const stitcher = new InformationStitcher(records)
  const stitched = stitcher.stitchByField(groupBy)
  fs.mkdirSync(path.dirname(outJson), { recursive: true })
  fs.writeFileSync(path.resolve(outJson), JSON.stringify(stitched, null, 2))
  const keys = Object.keys(stitched).slice(0, 20)
  const mdBlocks = keys.map(k => stitcher.toMarkdown(stitched[k]))
  fs.writeFileSync(path.resolve(outMd), mdBlocks.join('\n\n---\n\n'))
  return { countGroups: Object.keys(stitched).length, countRecords: records.length }
}

module.exports = { loadJsonRecords, loadJsonRecordsSync, stitchAndSave }

// CLI when run directly
if (require.main === module) {
  ;(async () => {
    const argv = process.argv.slice(2)
    const file = argv[0]
    if (!file) {
      console.error('Usage: node src/ingest/index.js <file> [--groupBy=meta.userId] [--outJson=...] [--outMd=...]')
      process.exit(1)
    }
    const opts = {}
    for (const a of argv.slice(1)) {
      if (a.startsWith('--groupBy=')) opts.groupBy = a.split('=')[1]
      if (a.startsWith('--outJson=')) opts.outJson = a.split('=')[1]
      if (a.startsWith('--outMd=')) opts.outMd = a.split('=')[1]
    }
    try {
      const res = await stitchAndSave({ filePath: file, groupBy: opts.groupBy, outJson: opts.outJson, outMd: opts.outMd })
      console.log('stitched', res)
    } catch (e) {
      console.error('error:', e)
      process.exit(1)
    }
  })()
}
