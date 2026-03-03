#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const inputPath = process.argv[2] || path.join(process.cwd(), 'output/stitched.json')
if (!fs.existsSync(inputPath)) { console.error('File not found:', inputPath); process.exit(1) }

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

// Group all events by user
const byUser = {}
Object.values(data).forEach(entry => {
  (entry.events || []).forEach(e => {
    const userId = e.meta?.userId || e.meta?.user_id || e.userId || 'unknown'
    const userName = e.meta?.username || e.meta?.userFullName || userId.slice(0, 8)
    if (!byUser[userId]) byUser[userId] = { name: userName, actions: [] }
    byUser[userId].actions.push({
      what: e.name || e.log,
      category: e.category,
      when: e.createdAt
    })
  })
})

// Output
Object.entries(byUser).forEach(([id, user]) => {
  console.log(`\n👤 ${user.name} (${user.actions.length} actions)`)
  user.actions.slice(-10).forEach(a => console.log(`   ${a.when?.slice(0,10) || '?'} | ${a.category} | ${a.what}`))
})
