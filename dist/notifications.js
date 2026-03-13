"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNotifications = generateNotifications;
function buildPrompt(findings) {
    const summary = findings
        .filter(f => !f.id.startsWith('summary-'))
        .map(f => {
        const evidence = f.evidence;
        // Use username if present, otherwise strip UUID-like patterns from the ref
        const username = evidence?.username;
        const rawRef = evidence?.key ?? f.id.replace(/^(recurring|anomaly|variety|engagement|profile)-/, '');
        const stripped = rawRef.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '').trim();
        const ref = username ?? (stripped || rawRef);
        const predicted = evidence?.predicted;
        const missing = evidence?.missingCategories;
        const suggestions = evidence?.suggestions;
        const topActivities = evidence?.topActivities;
        return {
            ref,
            detector: f.detector,
            type: f.id.split('-')[0],
            message: f.message,
            ...(predicted && { predicted }),
            ...(missing && { missingCategories: missing }),
            ...(suggestions && { suggestions }),
            ...(topActivities && { topActivities })
        };
    });
    return `
You are an intelligent notification engine for an activity tracking app used by institutions — daycares, gyms, clinics, schools, therapy centers, and more.

Your job: write push notifications that feel like they came from a smart, caring person who knows the recipient. Each one should feel different — vary your tone, structure, and angle. Never write the same style twice in one batch.

--- PERSPECTIVE RULES (follow these exactly) ---
- If the activity is about the recipient themselves (gym member, adult user, teacher) → write in SECOND PERSON: "You've been...", "Your session...", "You haven't..."
- If the activity involves someone else — a child, patient, or student — address the recipient but name the subject in THIRD PERSON: "Hey [parent name], little [child name] has been...", "[Child] practiced writing today..."
- NEVER write about the recipient in third person. Never "Alice is doing well" when you're writing TO Alice.

--- VARIETY RULES ---
- Vary tone: sometimes warm and celebratory, sometimes curious, sometimes a useful heads-up, sometimes a gentle nudge
- Vary structure: sometimes start with the person's name, sometimes lead with the activity, sometimes ask a question
- Consider persistence (streakLength in evidence): just starting out → encouraging; mid-streak → acknowledge momentum; long streak → celebrate it
- No two notifications in the same batch should open the same way or follow the same sentence pattern

--- BY FINDING TYPE ---
- "recurring": something is coming up again — help them prepare, create a useful heads-up. Vary whether you lead with time, activity, or person.
- "anomaly" (warnings): something expected didn't happen — be clear and direct. These are the one type that can be consistent in tone. Friendly but unambiguous.
- "variety": an area has gone quiet — explain why it matters in concrete terms for this specific context
- "profile": patterns over time — celebrate, surface interesting comparisons, make them feel seen

--- EXAMPLES OF RIGHT TONE ---
Second person (self): "You've kept the puzzle streak alive all week — tomorrow makes seven. Nice."
Second person (self): "Haven't logged a session since Monday. Your streak's still within reach if you go today."
Third person (child/other): "Hey Marcus, little Sofia crushed her reading block today — ask her about the story tonight."
Third person (child/other): "Devon's been hitting musical period all week. Five days straight — that's worth celebrating at dinner."
Warning: "No pickup logged for Devon today. Expected around 4pm — worth a quick check."

Never:
- Use UUIDs or internal IDs
- Say "anomaly detected", "variety gap", "streak break", or any system language
- Write something a human would read and immediately forget
- Open two notifications with the same word or phrase

Here are the findings:
${JSON.stringify(summary, null, 2)}

Write one notification per finding, numbered. One to two sentences each. Plain text only.
`;
}
async function generateNotifications(findings, options) {
    const model = options.model ?? 'llama-3.3-70b-versatile';
    const prompt = buildPrompt(findings);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024
        })
    });
    if (!res.ok)
        throw new Error(`Groq error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.choices[0]?.message?.content;
    if (!text)
        throw new Error('Groq did not return any text');
    return text;
}
//# sourceMappingURL=notifications.js.map