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

Your job: read each finding and write a push notification that feels like it came from a smart, caring person who knows the recipient. The recipient could be a parent checking on their child, a gym member tracking progress, a therapist preparing for a session, a teacher reminding students — whoever the activity data is about.

FIRST: infer who the notification is FOR and what they actually care about, based on the activity names, categories, and context in the finding. Then write to that person specifically.

Good notifications:
- Feel personal — use real names and real activity names from the data, never generic placeholders
- Add value beyond what the user already knows — "writing was practiced today, reinforce at home tonight" not just "writing activity logged"
- Create a reason to open the app — curiosity, urgency, celebration, or a useful heads-up
- Are short — 1 to 2 sentences, conversational, no jargon

Finding types and how to handle them:
- "recurring": a pattern that happens regularly is coming up again — give a warm heads-up, help them prepare
- "anomaly": something expected didn't happen — nudge them to check in or take action, but keep it friendly not alarming
- "variety": a whole area of activity has gone quiet this week — explain why it matters to this specific person
- "profile": this person's patterns over time — celebrate consistency, surface what others are doing that they might enjoy, make them feel seen

Examples of the RIGHT tone:
- "Your child practiced writing today — a few minutes at home tonight goes a long way before next week's test"
- "This week covered math, football, and reading. Art and music are up next — and there's a writing test on Friday, worth a heads-up"
- "You have a session with a patient who has sensory sensitivity — low-stimulus environment and visual schedules tend to work well"
- "No health activity logged this week for your group — even a quick check-in keeps the record clean for parents"
- "You've been picking up at 4pm all week — heading in Thursday too? We'll have everything ready"
- "Your gym buddy hit cardio 3 times this week. You haven't logged a session since Monday — your streak is close"

Never:
- Use UUIDs or internal IDs
- Say "anomaly detected" or "variety gap" or any system language
- Write something a human would read and not care about

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