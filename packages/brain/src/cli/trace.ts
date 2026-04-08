import fs from 'fs'
import path from 'path'
import type { EventGroupMap, Event, UserTrace } from '../types'

const inputPath = process.argv[2] || path.join(process.cwd(), 'output/stitched.json')

if (!fs.existsSync(inputPath)) {
  console.error('File not found:', inputPath)
  process.exit(1)
}

const data: EventGroupMap = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

const byUser: Record<string, UserTrace> = {}

Object.values(data).forEach(entry => {
  ;(entry.events || []).forEach((e: Event) => {
    const metaObject = typeof e.meta === 'object' && e.meta !== null ? e.meta as Record<string, unknown> : undefined
    const userId = String(metaObject?.userId ?? metaObject?.user_id ?? 'unknown')
    const userName = String(metaObject?.username ?? metaObject?.userFullName ?? userId.slice(0, 8))
    if (!byUser[userId]) byUser[userId] = { name: userName, actions: [] }

    const eventName = typeof e.name === 'string' ? e.name : undefined
    const eventLog = typeof e.log === 'string' ? e.log : undefined
    const eventCategory = typeof e.category === 'string' ? e.category : undefined
    byUser[userId].actions.push({
      what: eventName ?? eventLog,
      category: eventCategory,
      when: e.createdAt
    })
  })
})

Object.entries(byUser).forEach(([_id, user]) => {
  console.log(`\n${user.name} (${user.actions.length} actions)`)
  user.actions.slice(-10).forEach(a =>
    console.log(`   ${a.when?.slice(0, 10) ?? 'unknown'} | ${a.category} | ${a.what}`)
  )
})
