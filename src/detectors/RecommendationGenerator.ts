import { BaseDetector } from './BaseDetector'
import type { EventGroup, Event, Finding } from '../types'

interface UserProfile {
  interests: Record<string, number>
  activities: Set<string>
}

interface ActivityPopularity {
  activity: string
  popularity: number
}

export class RecommendationGenerator extends BaseDetector {
  private userProfiles: Record<string, UserProfile> = {}
  private usernames: Record<string, string> = {}
  private activityPopularity: Record<string, Set<string>> = {}

  constructor() {
    super({
      name: 'RecommendationGenerator',
      severity: 'info',
      description: 'Builds user profiles and generates activity recommendations'
    })
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const events = entry?.events || []

    for (const event of events) {
      const meta = event.meta as Record<string, unknown> | undefined
      const userId = meta?.userId || meta?.user_id || (event as Event & { userId?: string }).userId
      if (!userId || typeof userId !== 'string') continue

      if (!this.userProfiles[userId]) {
        this.userProfiles[userId] = { interests: {}, activities: new Set() }
        const username = meta?.username || meta?.name || meta?.displayName
        this.usernames[userId] = typeof username === 'string' ? username : userId
      }

      const profile = this.userProfiles[userId]
      const category = event.subcategory || event.category || 'general'
      profile.interests[category] = (profile.interests[category] || 0) + 1

      const activity = event.name || event.log || (event as Event & { title?: string }).title
      if (activity) {
        profile.activities.add(activity)
        if (!this.activityPopularity[activity]) {
          this.activityPopularity[activity] = new Set()
        }
        this.activityPopularity[activity].add(userId)
      }
    }

    return []
  }

  async finalize(): Promise<Finding[]> {
    const users = Object.keys(this.userProfiles)
    if (!users.length) return []

    const findings: Finding[] = []

    const popularActivities: ActivityPopularity[] = Object.entries(this.activityPopularity)
      .map(([activity, userSet]) => ({ activity, popularity: userSet.size }))
      .sort((a, b) => b.popularity - a.popularity)

    for (const [userId, profile] of Object.entries(this.userProfiles)) {
      const displayName = this.usernames[userId] ?? userId

      // Activities logged by other staff that this user has never logged
      const gaps = users.length > 1
        ? popularActivities
            .filter(({ activity }) => !profile.activities.has(activity))
            .slice(0, 3)
            .map(s => {
              const otherNames = [...this.activityPopularity[s.activity]]
                .map(uid => this.usernames[uid] ?? uid)
                .filter(n => n !== displayName)
                .slice(0, 2)
              return `${s.activity} (logged by ${otherNames.join(', ')})`
            })
        : []

      const topCategories = Object.entries(profile.interests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, count]) => `${cat} (${count}x)`)

      const evidenceData: Record<string, unknown> = {
        userId,
        username: displayName,
        totalLogged: profile.activities.size,
        mostLoggedCategories: topCategories,
        loggedActivities: [...profile.activities].slice(0, 10)
      }

      if (gaps.length) evidenceData.notYetLoggedByThisUser = gaps

      findings.push(this.createFinding({
        id: `profile-${userId}`,
        message: `${displayName} has logged ${profile.activities.size} unique activities — most in: ${topCategories.slice(0, 2).join(', ') || 'none yet'}`,
        evidence: evidenceData
      }))
    }

    const topActivities = popularActivities.slice(0, 3).map(p => p.activity)
    findings.unshift(this.createFinding({
      id: 'engagement-summary',
      message: `${users.length} users tracked, ${Object.keys(this.activityPopularity).length} unique activities${topActivities.length ? ` — most popular: ${topActivities.join(', ')}` : ''}`,
      evidence: {
        totalUsers: users.length,
        totalActivities: Object.keys(this.activityPopularity).length,
        topActivities
      }
    }))

    return findings
  }
}

export default RecommendationGenerator
