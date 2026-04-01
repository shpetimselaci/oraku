import fs from 'fs'
import path from 'path'
import keyBy from 'lodash/keyBy'
import type { Finding, Notification, NotificationOptions } from './types'

const TRAINING_FILE = path.resolve(__dirname, '../../data/training.jsonl')

function appendTrainingPair(input: object[], output: object[]): void {
  const line = JSON.stringify({ input, output }) + '\n'
  fs.appendFile(TRAINING_FILE, line, () => {})
}

const SYSTEM_PROMPT = `
You are a notification engine for an activity tracking app. Write short, warm, friendly push notifications.

Rules:
- Use the "topic" field to understand what this notification is about (e.g. "calorie-alert", "meal-variety", "fitness-streak") — let it guide the subject matter of your message
- Use the "context" field as the specific thing to reference — be concrete, never say "routine", "session", or "daily routine" as a fallback
- Use "subject" to understand who the activity is about:
  - If no "subject" field is present → always use second person: "You haven't logged a workout yet today."
  - If "subject" is present → it refers to someone else (a child, patient, or dependent) — address the recipient and name the subject: "Liam hasn't had his afternoon snack logged yet."
- Never mention a time, date, or timestamp
- Never use dashes (—, -, –) in the message
- One sentence per notification, ending with a period
- Never use system words: "anomaly", "streak", "streak break", "variety gap", "detector", "finding", "pattern"
- Vary how each notification opens — no two should start the same way
- Never include UUIDs or internal IDs
- Keep the tone warm, human, and conversational

Notification types and tone:
- "reminder": something is coming up or due soon — give a gentle, friendly heads-up
- "warning": something expected did not happen or a threshold was hit — be direct but supportive, not alarming
- "achievement": something positive was completed — be encouraging and celebratory
- "insight": an observation about activity or data — be informative and conversational
- "nudge": a soft suggestion to act — be friendly and low-pressure

Return ONLY a JSON array. No other text.
Each object must have "id" (echo it back unchanged), "ref" (echo it back unchanged), and "message" (string).
`

function buildFindings(findings: Finding[]): { payload: object[]; refMap: Map<string, string>; idMap: Map<string, string> } {
  const refMap = new Map<string, string>()
  const idMap = new Map<string, string>()
  let counter = 0

  const anonRef = (realRef: string): string => {
    for (const [anon, real] of refMap) if (real === realRef) return anon
    const anon = `u${++counter}`
    refMap.set(anon, realRef)
    return anon
  }

  const payload = findings
    .filter(f => !f.id.startsWith('summary-'))
    .map((f, i) => {
      const anonId = `f${i + 1}`
      idMap.set(anonId, f.id)
      const evidence = f.evidence as Record<string, unknown>
      const rawRef = (evidence?.key as string) ?? f.id.replace(/^(recurring|anomaly|variety|engagement|profile)-/, '')
      const realRef = rawRef.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '').trim() || rawRef
      const missing = evidence?.missingCategories as string[] | undefined
      const suggestions = evidence?.suggestions as string[] | undefined
      const topActivities = evidence?.topActivities as string[] | undefined
      return {
        id: anonId,
        ref: anonRef(realRef),
        type: f.notificationType,
        topic: f.detector,
        context: f.message,
        ...(missing && { missingCategories: missing }),
        ...(suggestions && { suggestions }),
        ...(topActivities && { topActivities })
      }
    })

  return { payload, refMap, idMap }
}

export async function generateNotifications(
  findings: Finding[],
  options: NotificationOptions
): Promise<Notification[]> {
  const findingById = keyBy(findings, 'id')

  const { payload, refMap, idMap } = buildFindings(findings)
  const text = await options.provider.complete(JSON.stringify(payload), SYSTEM_PROMPT)
  if (!text) throw new Error('LLM provider did not return any text')

  try {
    const parsed: Array<{ id: string; ref: string; message: string }> = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    appendTrainingPair(payload, parsed)
    return parsed.map(item => {
      const realId = idMap.get(item.id) ?? item.id
      const source = findingById[realId]
      let scheduledAt: string | undefined
      if (source?.notificationType === 'reminder') {
        const predicted = source.evidence?.predicted as string | undefined
        if (predicted) {
          scheduledAt = new Date(new Date(predicted).getTime() - 30 * 60 * 1000).toISOString()
        }
      }
      const permanent = (source?.evidence as Record<string, unknown>)?.permanent === true
      return {
        ref: refMap.get(item.ref) ?? item.ref,
        message: item.message,
        detector: source?.detector ?? 'unknown',
        type: source?.notificationType ?? 'insight',
        ...(scheduledAt && { scheduledAt }),
        ...(permanent && { permanent: true })
      }
    })
  } catch {
    console.warn('[generateNotifications] Failed to parse LLM response as JSON')
    return []
  }
}
