import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import type { Finding } from '../types'

const FINDINGS_FILE = path.resolve(__dirname, '..', '..', 'output', 'findings.json')

async function generateRemindersWithGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    })
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  const text = data.choices[0]?.message?.content
  if (!text) throw new Error('Groq did not return any text')
  return text
}

;(async () => {
  if (!fs.existsSync(FINDINGS_FILE)) {
    console.log('no findings.json found, run npm run detect first')
    process.exit(0)
  }

  const findings: Finding[] = JSON.parse(fs.readFileSync(FINDINGS_FILE, 'utf8'))

  const findingsSummary = findings
    .filter(f => !f.id.startsWith('summary-'))
    .map(f => {
      const evidence = f.evidence as Record<string, unknown>
      const ref = evidence?.key as string
        ?? f.id.replace(/^(recurring|anomaly|variety|engagement)-/, '')
      const predicted = evidence?.predicted as string | undefined
      const missing = evidence?.missingCategories as string[] | undefined
      return {
        ref,
        detector: f.detector,
        type: f.id.split('-')[0],
        message: f.message,
        ...(predicted && { predicted }),
        ...(missing && { missingCategories: missing })
      }
    })

  const prompt = `
You are writing push notifications for staff at institutions like daycares, gyms, clinics, schools, and hotels.

Your job is to turn each finding into a smart, friendly, specific push notification — like a knowledgeable colleague giving a heads up. Think about what the activity actually means and give real context or advice, not just a restatement.

Bad example: "Health not logged this week"
Good example: "No health checks logged this week — make sure temperatures and diaper changes are up to date before parents pick up"

Bad example: "Curriculum activity log was due 30 minutes ago"
Good example: "Alphabet practice was scheduled and hasn't been logged yet — the kids are waiting!"

For each finding write exactly 2 lines:
1. [DetectorName] your notification here
   (for ref: the ref value)

Timing context:
- type "recurring" = activity coming up soon, remind staff it's about to happen
- type "anomaly" = activity was expected but missed, staff should act now
- type "variety" = whole category hasn't been touched this week, remind why it matters

Translate any category/subcategory codes into plain English. No UUIDs in the notification text.

Here are the findings:
${JSON.stringify(findingsSummary, null, 2)}

Output each finding numbered, two lines each, plain text only.
`

  try {
    const message = await generateRemindersWithGroq(prompt)
    const outFile = path.resolve(__dirname, '..', '..', 'output', 'reminders.txt')
    fs.writeFileSync(outFile, message, 'utf8')
    console.log('reminders generated to', outFile)
  } catch (err) {
    console.error('AI call failed:', (err as Error).message)
  }
})()
