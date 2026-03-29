import type { Finding, Notification, NotificationOptions } from './types'

function extractActivity(message: string): string {
  // matches any "category/subcategory" pattern e.g. "nutrition/meal_log", "routine/gym_session"
  const match = message.match(/\b([a-z_]+)\/([a-z_]+)\b/i)
  if (match) return match[2].replace(/_/g, ' ')
  // fallback: grab the word after "next" or "for"
  const catMatch = message.match(/(?:next|for)\s+([a-z_]+)/i)
  return catMatch ? catMatch[1].replace(/_/g, ' ') : 'session'
}

const SYSTEM_PROMPT = `
You are a notification engine for an activity tracking app. Write push notifications that feel personal and direct.

Rules:
- Use the "activity" field as the specific thing to mention — never say "routine" or "daily routine"
- Never mention a time, date, or prediction timestamp
- Never use dashes (—, -, –) anywhere in the message
- Each notification is one sentence. End with a period.
- If the activity is about the recipient themselves → second person: "Your gym session is coming up."
- If the activity involves someone else (child, patient) → address the recipient, name the subject: "Devon hasn't logged a reading session in a few days."
- "recurring" type: something is coming up soon, give them a heads-up
- "anomaly" type: something expected didn't happen, be direct and friendly
- Vary how each notification opens — never start two the same way
- Never use UUIDs or internal IDs
- Never say "anomaly", "streak break", "variety gap", or any system language
- Return ONLY a JSON array. No other text.
- Each object must have "id" (echo it back unchanged), "ref" (string), and "message" (string).
`

function buildFindings(findings: Finding[]): object[] {
  return findings
    .filter(f => !f.id.startsWith('summary-'))
    .map(f => {
      const evidence = f.evidence as Record<string, unknown>
      const username = evidence?.username as string | undefined
      const rawRef = (evidence?.key as string) ?? f.id.replace(/^(recurring|anomaly|variety|engagement|profile)-/, '')
      const stripped = rawRef.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '').trim()
      const ref = username ?? (stripped || rawRef)
      const missing = evidence?.missingCategories as string[] | undefined
      const suggestions = evidence?.suggestions as string[] | undefined
      const topActivities = evidence?.topActivities as string[] | undefined
      const activity = extractActivity(f.message)
      return {
        id: f.id,
        ref,
        type: f.id.split('-')[0],
        activity,
        ...(missing && { missingCategories: missing }),
        ...(suggestions && { suggestions }),
        ...(topActivities && { topActivities })
      }
    })
}

export async function generateNotifications(
  findings: Finding[],
  options: NotificationOptions
): Promise<Notification[]> {
  const findingById = Object.fromEntries(findings.map(f => [f.id, f]))

  const text = await options.provider.complete(JSON.stringify(buildFindings(findings)), SYSTEM_PROMPT)
  if (!text) throw new Error('LLM provider did not return any text')

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  const cleaned = jsonMatch ? jsonMatch[0] : '[]'
  try {
    const parsed: Array<{ id: string; ref: string; message: string }> = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => {
      const source = findingById[item.id]
      return {
        ref: item.ref,
        message: item.message,
        detector: source?.detector ?? 'unknown',
        type: source?.notificationType ?? 'insight'
      }
    })
  } catch {
    console.warn('[generateNotifications] Failed to parse LLM response as JSON')
    return []
  }
}
