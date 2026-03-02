require('dotenv').config(); 

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const FINDINGS_DIR = path.resolve(__dirname, '..', '..', 'output', 'findings');
async function aiRequest(prompt) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || 'gemma-3-27b-it';

  if (!key) throw new Error('GEMINI_API_KEY is missing in your .env');

  // Use native Gemini API endpoint (v1beta)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Gemini Error: ${data.error.message}`);
  }

  // native Gemini response shape
  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    console.error('Unexpected Gemini response:', JSON.stringify(data, null, 2));
    throw new Error('Gemini did not return any text');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

(async () => {
  if (!fs.existsSync(FINDINGS_DIR)) {
    console.log('no findings directory, nothing to do');
    process.exit(0);
  }

  const files = fs.readdirSync(FINDINGS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('no finding files');
    process.exit(0);
  }

  // load all findings; you can also generate one reminder per finding
  const findings = files.map(f =>
    JSON.parse(fs.readFileSync(path.join(FINDINGS_DIR, f), 'utf8'))
  );

  const prompt = `
    You are an assistant that turns detector findings into
    actionable reminders for a given individual.
    Be friendly, and 
    Here are the raw findings objects:

    ${JSON.stringify(findings, null, 2)}

    For each finding, write a short, friendly reminder/suggestion. Include
    the key/severity. Output plain
    text as it needds to be included in a mobile notification so the user can easily understand and act on it.
  `;

  try {
    const message = await aiRequest(prompt);

    // save the generated text
    const outFile = path.join(FINDINGS_DIR, 'reminders.txt');
    fs.writeFileSync(outFile, message, 'utf8');
    console.log('reminders generated to', outFile);
  } catch (err) {
    console.error('AI call failed:', err.message);
  }
})();