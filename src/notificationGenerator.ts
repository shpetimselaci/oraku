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
- If "alreadyLogged" is present, reference what was already done to make the message feel more personal. Example: if breakfast is logged and lunch/snack are missing, lead with what's done: "Breakfast is sorted for Emma, but lunch and snack still need to be added."
- If "streakLength" is present, use it to make the message specific. A streak of 14 days is very different from 3 days — say so. Example: "Emma's been at it for 14 days in a row" or "Liam's just getting started, 3 days in."
- If "recentActivity" is present, it contains the last 1-2 things the subject actually did. Use these to anchor the message in something real and specific. A reminder is much stronger when it references what already happened today than when it speaks in generalities. Example: if recentActivity is ["Emma painted a butterfly in art class"], a reminder about logging the afternoon could say "Emma had a busy morning with painting" rather than "Don't forget to log Emma's afternoon." Never copy recentActivity verbatim — extract the meaning and weave it in naturally.
- If numeric values are present (e.g. nutrient amounts), NEVER list the raw numbers. Translate them into plain language: instead of "6.3 grams of protein", say "very little protein" or "almost no protein today".
- Use "subject" to understand who the activity is about:
  - If no "subject" → second person always: "You haven't logged a workout yet today."
  - If "subject" is present → the subject is who the activity is ABOUT, never who you are talking TO. Always address the parent/recipient in second person and refer to the subject by FIRST NAME ONLY. Be direct and specific — name exactly what happened or what is missing.
- Never mention a time, date, or timestamp
- Never use dashes (—, -, –) in the message
- Never use these words or phrases: "anomaly", "streak", "streak break", "variety gap", "detector", "finding", "pattern", "consider", "try to", "try adding", "could benefit from", "might help", "might want to", "seems to have", "check in", "incorporate into", "keep the momentum going"
- Every message in a batch must open differently. Never use the same sentence structure twice. Vary: lead with the activity, lead with a question, lead with what's already done, lead with the consequence, lead with an exclamation.
- Use contractions, short sentences, natural language. Write like a thoughtful person texting the parent, not a system alert.
- Do not append suggestions as short disconnected follow-ups. Instead of: "Emma's low on protein. Worth adding something." write it as one flowing sentence: "Emma's been pretty light on protein today. Something like eggs or cheese at dinner could make a real difference."

Notification types and tone:
- "reminder": a gentle heads-up that something needs to happen today. Keep it light and warm. If "recentActivity" is present, use it to ground the reminder in what actually happened — this is the primary way to vary reminders. If "streakLength" is present you can weave it in subtly for variety, but don't make it the focus — the reminder itself is the point.
- "warning": something expected didn't happen or a threshold was crossed — be direct, no hedging
- "achievement": something positive was completed — be celebratory and specific
- "insight": an observation about data — be informative, conversational, translate numbers into plain language
- "nudge": a soft prompt about something missing — use alreadyLogged to acknowledge what's done, then name what's missing

When topic is "org-benchmark", the evidence contains platform-wide stats for the user's organisation. Use these fields to write a single engaging insight:
- "todayRates": object of category → % of org active today. Pick the most interesting rate to mention. Translate to plain language: "Most of your organisation sent communications today" not "68% todayRates.communication".
- "topThisWeek": array of top categories this week. Lead with the most popular one naturally.
- "trending": array of categories with direction ("up" or "down") and change percentage. Only mention if the change is meaningful. Translate: "communication is picking up across the org" not "communication up 45%".
- "orgSize": total users in the org — do NOT mention this number directly.
Tone: curious, light, LinkedIn-style. Make the user feel connected to what's happening around them. Never reveal individual names or individual stats.

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
      const covered = evidence?.covered as string[] | undefined
      const suggestions = evidence?.suggestions as string[] | undefined
      const topActivities = evidence?.topActivities as string[] | undefined
      const streakLength = evidence?.streakLength as number | undefined
      const evidenceEvents = evidence?.events as Array<{ log?: string }> | undefined
      const recentActivity = evidenceEvents?.slice(-2).map(e => e.log).filter(Boolean) as string[] | undefined
      const todayRates = evidence?.todayRates as Record<string, number> | undefined
      const topThisWeek = evidence?.topThisWeek as Array<{ category: string; count: number }> | undefined
      const trending = evidence?.trending as Array<{ category: string; change: number; direction: string }> | undefined
      return {
        id: anonId,
        ref: anonRef(realRef),
        type: f.notificationType,
        topic: f.detector,
        context: f.message,
        ...(subject && { subject }),
        ...(missing && { missingCategories: missing }),
        ...(covered?.length && { alreadyLogged: covered }),
        ...(suggestions && { suggestions }),
        ...(topActivities && { topActivities }),
        ...(streakLength && { streakLength }),
        ...(recentActivity?.length && { recentActivity }),
        ...(todayRates && Object.keys(todayRates).length && { todayRates }),
        ...(topThisWeek?.length && { topThisWeek }),
        ...(trending?.length && { trending })
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
