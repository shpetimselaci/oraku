import fs from 'fs'
import { WordNet } from 'natural'

interface ActivityEvent {
  externalRef: string
  category: string
  subcategory: string
  log: string
  name: string
  createdAt: string
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function getActivityWords(): Promise<string[]> {
  return new Promise((resolve) => {
    const wn = new WordNet()
    wn.lookup('activity', (results: Array<{ synonyms?: string[] }>) => {
      if (!results || !results.length) return resolve(['activity'])
      const words = new Set<string>()
      results.forEach(r => {
        ;(r.synonyms || []).forEach(w => words.add(w.replace(/_/g, ' ')))
      })
      resolve([...words])
    })
  })
}

;(async () => {
  const words = await getActivityWords()
  const events: ActivityEvent[] = []

  for (let i = 0; i < 20; i++) {
    const verb = pickRandom(words)
    events.push({
      externalRef: `gen-${i + 1}`,
      category: 'activity',
      subcategory: 'generated',
      log: verb,
      name: verb,
      createdAt: new Date(Date.now() - Math.random() * 1e10).toISOString()
    })
  }

  fs.writeFileSync('output/natural-activities.json', JSON.stringify(events, null, 2))
  console.log('wrote', events.length, 'events')
})()
