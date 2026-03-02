const path = require('path')
const fs = require('fs')

// Import your stitched data loader
const { loadJsonRecordsSync } = require('./ingest/index')

// Import detector manager
const DetectorManager = require('./detectors/DetectorManager')

// Optionally regenerate stitched data so detector run always uses same grouping.
const { stitchAndSave } = require('./ingest/index')
const rawFile = path.resolve(__dirname, '..', 'output/activity_events_2026-02-17T14-57-49-670Z.json')
const stitchedFile = path.resolve(__dirname, '..', 'output/stitched.json') // project-root/output

// if raw file exists, rebuild stitched output using groupBy=name
if (fs.existsSync(rawFile)) {
  console.log('Re-stitching raw events into', stitchedFile)
  try {
    stitchAndSave({ filePath: rawFile, groupBy: ['name','category'], outJson: stitchedFile })
  } catch (e) {
    console.error('stitch error', e.message)
  }
}

let stitchedData = {}
if (fs.existsSync(stitchedFile)) {
  stitchedData = require(stitchedFile)
} else {
  console.error('No stitched file found at', stitchedFile)
  process.exit(1)
}

// Create manager instance; default filter will be ContextBasedFilter
const ContextBasedFilter = require('./detectors-filter/ContextBasedFilter')

const manager = new DetectorManager({
  filterMechanism: new ContextBasedFilter()
})

// Run all detectors
;(async () => {
  const findings = await manager.runOnStitched(stitchedData)

  // clean existing findings directory so stale files don't linger
  const findingsDir = path.resolve(__dirname, '..', 'output/findings')
  if (fs.existsSync(findingsDir)) {
    fs.rmSync(findingsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(path.resolve(__dirname, '..', 'output/findings'), { recursive: true })

  // write out each finding; guard against duplicate ids by appending a counter
  const usedNames = {}
  findings.forEach((f, idx) => {
    let base = f.id || f.key || f.detector || `finding-${idx}`
    // sanitize base to filesystem-safe string
    base = base.replace(/[\s\/\\]+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')

    if (usedNames[base] == null) usedNames[base] = 0
    else usedNames[base] += 1
    const suffix = usedNames[base] ? `-${usedNames[base]}` : ''
    const filePath = path.resolve(findingsDir, `${base}${suffix}.json`)
    fs.writeFileSync(filePath, JSON.stringify(f, null, 2))
  })

  console.log(`Detected ${findings.length} findings.`)
})()