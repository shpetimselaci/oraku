"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDetector = void 0;
const BaseDetector_1 = require("./BaseDetector");
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SYSTEM_PROMPT = `
You are a security and activity log analyst. 
Analyze the provided logs and return a JSON array of findings.
Rules:
- severity must be: "info", "warning", or "success".
- Return ONLY the JSON array. 
- No conversational text or markdown blocks.
- If no issues are found, return [].
`;
class AutoDetector extends BaseDetector_1.BaseDetector {
    apiKey;
    model;
    maxEvents;
    timeout;
    isFallback = true;
    constructor(config = {}) {
        super({ name: 'AutoDetector', severity: 'info', ...config });
        this.apiKey = config.apiKey ?? process.env.GROQ_API_KEY;
        this.model = config.model ?? 'llama-3.1-8b-instant';
        this.maxEvents = config.maxEvents ?? 30;
        this.timeout = config.timeout ?? 15000;
    }
    async detect(entry) {
        if (!this.apiKey) {
            console.warn(`[${this.name}] Skipping: No API Key found.`);
            return [];
        }
        const events = this.extractEvents(entry);
        if (!events.length)
            return [];
        // Use the optimized date filter from BaseDetector
        const todayEvents = this.filterEventsByDateRange(events, new Date(), 'day');
        const sourceEvents = todayEvents.length ? todayEvents : events;
        // Build a compact representation to save tokens
        const eventText = sourceEvents
            .slice(0, this.maxEvents)
            .map(e => `${e.createdAt?.slice(11, 19) ?? '??'} | ${e.category ?? 'log'} | ${e.name ?? e.log ?? ''}`)
            .join('\n');
        if (!eventText)
            return [];
        try {
            const findings = await this.callLLMWithRetry(eventText, entry.externalRef, 2);
            return findings.map((f, i) => this.buildFinding({
                // Use random suffix to prevent ID collisions from the LLM
                id: `ai-${entry.externalRef ?? 'gen'}-${i}-${Math.random().toString(36).slice(2, 5)}`,
                severity: this.normalizeSeverity(f.severity),
                message: f.message,
                evidence: {
                    category: f.category,
                    analysis: f.evidence,
                    llm_model: this.model
                }
            }));
        }
        catch (err) {
            console.error(`[${this.name}] Detection failed:`, err instanceof Error ? err.message : err);
            return [];
        }
    }
    async callLLMWithRetry(text, ref, retries) {
        for (let i = 0; i <= retries; i++) {
            try {
                return await this.callLLM(text, ref);
            }
            catch (err) {
                if (i === retries)
                    throw err;
                // Exponential backoff: 500ms, 1000ms...
                await new Promise(res => setTimeout(res, Math.pow(2, i) * 500));
            }
        }
        return [];
    }
    async callLLM(eventText, context) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Analyze context "${context ?? 'unknown'}":\n${eventText}` }
                    ],
                    temperature: 0.1, // Lower temperature for more stable JSON
                    response_format: { type: "json_object" } // Groq supports JSON mode
                }),
                signal: controller.signal
            });
            if (!res.ok)
                throw new Error(`Groq API Error: ${res.status}`);
            const data = (await res.json());
            // we know choices may be undefined so fallback to empty array
            let content = data.choices?.[0]?.message?.content?.trim() || '[]';
            // Robust JSON Extraction (strip anything before/after the array)
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const cleaned = jsonMatch ? jsonMatch[0] : content;
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed : [];
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    normalizeSeverity(sev) {
        const s = sev?.toLowerCase();
        if (s === 'warning' || s === 'success' || s === 'info' || s === 'critical') {
            return s;
        }
        return this.severity; // fallback to configured severity
    }
}
exports.AutoDetector = AutoDetector;
exports.default = AutoDetector;
//# sourceMappingURL=AutoDetector.js.map