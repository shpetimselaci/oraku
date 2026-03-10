import fs from 'fs'
import path from 'path'
import type { EventGroupMap, Event } from '../types'

const inputPath = process.argv[2] || path.join(process.cwd(), 'output/stitched.json')

if (!fs.existsSync(inputPath)) {
  console.error('File not found:', inputPath)
  process.exit(1)
}

const data: EventGroupMap = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

interface UserTrace {
  name: string
  actions: Array<{ what: string | undefined; category: string | undefined; when: string | undefined }>
}

const byUser: Record<string, UserTrace> = {}

Object.values(data).forEach(entry => {
  ;(entry.events || []).forEach((e: Event) => {
    const meta = e.meta as Record<string, unknown> | undefined
    const userId = String(meta?.userId ?? meta?.user_id ?? 'unknown')
    const userName = String(meta?.username ?? meta?.userFullName ?? userId.slice(0, 8))
    if (!byUser[userId]) byUser[userId] = { name: userName, actions: [] }
    byUser[userId].actions.push({
      what: e.name ?? e.log,
      category: e.category,
      when: e.createdAt
    })
  })
})

Object.entries(byUser).forEach(([_id, user]) => {
  console.log(`\n${user.name} (${user.actions.length} actions)`)
  user.actions.slice(-10).forEach(a =>
    console.log(`   ${a.when?.slice(0, 10) ?? '?'} | ${a.category} | ${a.what}`)
  )
})
