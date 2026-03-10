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

export class RecommendationDetector extends BaseDetector {
  private userProfiles: Record<string, UserProfile> = {}
  private activityPopularity: Record<string, Set<string>> = {}

  constructor() {
    super({
      name: 'RecommendationDetector',
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
      const topInterests = Object.entries(profile.interests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count})`)

      const suggestions = users.length > 1
        ? popularActivities
            .filter(({ activity }) => !profile.activities.has(activity))
            .slice(0, 3)
            .map(s => `${s.activity} (${s.popularity}/${users.length} users)`)
        : []

      const evidenceData: Record<string, unknown> = {
        userId,
        totalActivities: profile.activities.size,
        topInterests,
        activitiesList: [...profile.activities].slice(0, 10)
      }

      if (suggestions.length) evidenceData.suggestions = suggestions

      findings.push(this.createFinding({
        id: `profile-${userId}`,
        message: `User Profile: ${userId.slice(0, 8)}...`,
        evidence: evidenceData
      }))
    }

    findings.unshift(this.createFinding({
      id: 'engagement-summary',
      message: `Engagement: ${users.length} user(s), ${Object.keys(this.activityPopularity).length} activities tracked`,
      evidence: {
        totalUsers: users.length,
        totalActivities: Object.keys(this.activityPopularity).length,
        topActivities: popularActivities.slice(0, 5).map(p => p.activity)
      }
    }))

    return findings
  }
}

export default RecommendationDetector
