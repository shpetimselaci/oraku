import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { DetectorManager } from '../detectors/DetectorManager'
import type { EventGroupMap } from '../types'

const args = process.argv.slice(2)
const options: { stitchedPath?: string; outputPath?: string; only?: string } = {}

for (const arg of args) {
  if (arg.startsWith('--stitched=')) options.stitchedPath = arg.split('=')[1]
  if (arg.startsWith('--out=')) options.outputPath = arg.split('=')[1]
  if (arg.startsWith('--only=')) options.only = arg.split('=')[1]
}

if (!options.stitchedPath) options.stitchedPath = path.join(process.cwd(), 'output', 'stitched.json')
if (!options.outputPath) options.outputPath = path.join(process.cwd(), 'output', 'findings.json')

if (!fs.existsSync(options.stitchedPath)) {
  console.error('stitched not found:', options.stitchedPath)
  process.exit(2)
}

const stitchedData: EventGroupMap = JSON.parse(fs.readFileSync(options.stitchedPath, 'utf8'))

// ─── Register your custom detectors here ───────────────────────────────────
// createDetector('MyStreak',    'streak-ongoing', { minRepeat: 3 })
// createDetector('MyBreak',     'streak-break',   { minRepeat: 3, severity: 'warning' })
// createDetector('MyChecklist', 'checklist',      { expected: ['item-a', 'item-b'], todayOnly: true })
// ───────────────────────────────────────────────────────────────────────────

const detectorManager = new DetectorManager({ only: options.only })

async function main(): Promise<void> {
  const findings = await detectorManager.runDetectorsOn(stitchedData)
  fs.writeFileSync(options.outputPath!, JSON.stringify(findings, null, 2))
  console.log('detectors complete:', findings.length, 'findings saved to', options.outputPath)
}

main().catch(e => { console.error(e); process.exit(1) })
