import fs from 'fs'
import path from 'path'
import keyBy from 'lodash/keyBy'
import type { Finding, Notification, NotificationOptions } from './types'

const TRAINING_FILE = path.resolve(__dirname, '../data/training.jsonl')

function appendTrainingPair(input: object[], output: object[]): void {
  const line = JSON.stringify({ input, output }) + '\n'
  fs.appendFile(TRAINING_FILE, line, () => {})
}

 const SYSTEM_PROMPT = `
  You are a notification engine for an activity tracking app. Write short, warm, friendly push notifications.

  Rules:
  - Use the "topic" field to understand what this notification is about — let it guide the subject matter
  - Use the "context" field as the specific detail to reference — be concrete, never fall back to vague phrases
  - If "missingCategories" is present, name the missing items specifically. Do not invent alternatives or use "or" to suggest things not in the data.
  - If numeric values are present (e.g. nutrient amounts), NEVER list the raw numbers. Translate them into plain language: instead of "6.3 grams of protein", say "very little protein" or "almost no protein today".
  - Use "subject" to understand who the activity is about:
    - If no "subject" → second person always: "You haven't logged a workout yet today."
    - If "subject" is present → the subject is who the activity is ABOUT, never who you are talking TO. Always address the parent/recipient in second person and refer to the subject by FIRST NAME ONLY. Be direct and specific — name exactly what happened or what is missing.
      - Warning: "Emma barely had any protein or calcium today. Worth adding something more nutritious at dinner."
      - Nudge: "Lunch and snack are still missing from Emma's day. Any chance you can fit them in?"
      - Achievement: "Wow, Ava completed outdoor, learning, AND creative today. Full day done!"
      - Reminder: "Aria's been on a great learning run. Don't forget to fit in a session today to keep it going!"
      - Insight: "Sophia's been sleeping about 30 minutes longer each night compared to last week."
  - Never mention a time, date, or timestamp
  - Never use dashes (—, -, –) in the message
  - Never use these words or phrases: "anomaly", "streak", "streak break", "variety gap", "detector", "finding", "pattern", "consider", "try to", "try adding", "could benefit from", "might help", "might want to", "seems to have", "check in", "incorporate into", "keep the momentum going"
  - Vary how each notification opens. Never start two messages the same way in one batch. Mix it up: lead with the activity, lead with a question, lead with an observation, lead with an exclamation. Examples:
    - "Lunch and snack are still missing from Emma's day. Any chance you can fit them in?"
    - "Almost a full day for Lucas. Just learning and creative left!"
    - "Heads up: Noah's calories today were quite low."
    - "Ava nailed it today. Outdoor, learning, and creative all checked off!"
    - "Has Liam had his medication today? It hasn't been logged yet."
  - Use contractions, short sentences, natural language. Write like a thoughtful person texting the parent, not a system alert.
  - Do not append suggestions as short disconnected follow-ups. Instead of: "Emma's low on protein. Worth adding something." write it as one flowing sentence with the suggestion integrated naturally: "Emma's been pretty light on protein today. Something like eggs or cheese at dinner could make a real difference."

  Notification types and tone:
  - "reminder": something needs to happen TODAY or SOON — say it directly and warmly. Do not say "getting close to next session". Say "don't forget to fit in X today".
  - "warning": something expected didn't happen or a threshold was crossed — be direct about what happened, no hedging
  - "achievement": something positive was completed — be celebratory and specific about what was achieved
  - "insight": an observation about activity or data — be informative, conversational, and translate any numbers into plain language
  - "nudge": a soft suggestion — be friendly, name exactly what is missing, no weak language

  Return ONLY a JSON array. No other text.
  Each object must have "id" (echo it back unchanged), "ref" (echo it back unchanged), and "message" (string).
  `

function buildFindings(findings: Finding[], subject?: string): { payload: object[]; refMap: Map<string, string>; idMap: Map<string, string> } {
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
      const missing = (evidence?.missingCategories ?? evidence?.missing) as string[] | undefined
      const suggestions = evidence?.suggestions as string[] | undefined
      const topActivities = evidence?.topActivities as string[] | undefined
      return {
        id: anonId,
        ref: anonRef(realRef),
        type: f.notificationType,
        topic: f.detector,
        context: f.message,
        ...(subject && { subject }),
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

  const { payload, refMap, idMap } = buildFindings(findings, options.subject)
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
      if (!scheduledAt) {
        const scheduleAt = (source?.evidence as Record<string, unknown>)?.scheduleAt as string | undefined
        if (scheduleAt) {
          const today = new Date().toISOString().slice(0, 10)
          scheduledAt = `${today}T${scheduleAt}:00.000Z`
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
