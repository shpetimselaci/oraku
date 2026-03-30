import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import type { Finding } from '../types'
import { generateNotifications } from '../notificationGenerator'
import { ChatProvider } from '../providers/ChatProvider'

const FINDINGS_FILE = path.resolve(__dirname, '..', '..', 'output', 'findings.json')

;(async () => {
  if (!fs.existsSync(FINDINGS_FILE)) {
    console.log('no findings.json found, run npm run detect first')
    process.exit(0)
  }

  const findings: Finding[] = JSON.parse(fs.readFileSync(FINDINGS_FILE, 'utf8'))

  try {
    const provider = new ChatProvider({ baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL })
    const message = await generateNotifications(findings, { provider })
    const outFile = path.resolve(__dirname, '..', '..', 'output', 'reminders.txt')
    fs.writeFileSync(outFile, JSON.stringify(message, null, 2), 'utf8')
    console.log('reminders generated to', outFile)
  } catch (err) {
    console.error('generation failed:', (err as Error).message)
  }
})()
