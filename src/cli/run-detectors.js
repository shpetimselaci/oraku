#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const DetectorManager = require('../detectors/DetectorManager')

function usage(){
  console.log('Usage: node src/cli/run-detectors.js --stitched=path --out=path')
  process.exit(1)
}

const args = process.argv.slice(2)
const options = {}
for (const arg of args){
  if (arg.startsWith('--stitched=')) options.stitchedPath = arg.split('=')[1]
  if (arg.startsWith('--out=')) options.outputPath = arg.split('=')[1]
  if (arg.startsWith('--only=')) options.only = arg.split('=')[1]
}
if (!options.stitchedPath) options.stitchedPath = path.join(process.cwd(),'output','stitched.json')
if (!options.outputPath) options.outputPath = path.join(process.cwd(),'output','findings.json')

if (!fs.existsSync(options.stitchedPath)) { console.error('stitched not found:', options.stitchedPath); process.exit(2) }

const stitchedData = JSON.parse(fs.readFileSync(options.stitchedPath,'utf8'))
const detectorManager = new DetectorManager({ only: options.only })

async function main(){
  const findings = await detectorManager.runOnStitched(stitchedData)
  fs.writeFileSync(options.outputPath, JSON.stringify(findings, null, 2))
  console.log('detectors complete:', findings.length, 'findings saved to', options.outputPath)
}

main().catch(e=>{ console.error(e); process.exit(1) })
