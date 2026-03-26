import { BaseDetector } from './BaseDetector'
import type { EventGroup, Finding, UserProfile, ActivityPopularity } from '../types'

export class RecommendationGenerator extends BaseDetector {
  private userProfiles: Record<string, UserProfile> = {}
  private usernames: Record<string, string> = {}
  private activityPopularity: Record<string, Set<string>> = {}

  constructor() {
    super({
      name: 'RecommendationGenerator',
      notificationType: 'suggestion',
      description: 'Builds user profiles and generates activity recommendations'
    })
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const events = entry?.events || []

    for (const event of events) {
      const userId = this.getNestedString(event, 'meta', 'userId')
        ?? this.getNestedString(event, 'meta', 'user_id')
        ?? this.getString(event, 'userId')
      if (!userId) continue

      if (!this.userProfiles[userId]) {
        this.userProfiles[userId] = { interests: {}, activities: new Set() }
        const username = this.getNestedString(event, 'meta', 'username')
          ?? this.getNestedString(event, 'meta', 'name')
          ?? this.getNestedString(event, 'meta', 'displayName')
        this.usernames[userId] = username ?? userId
      }

      const profile = this.userProfiles[userId]
      const eventCategory = this.getEventCategory(event) ?? 'general'
      profile.interests[eventCategory] = (profile.interests[eventCategory] || 0) + 1

      const activityLabel = this.getEventLabel(event)
      if (activityLabel) {
        profile.activities.add(activityLabel)
        if (!this.activityPopularity[activityLabel]) {
          this.activityPopularity[activityLabel] = new Set()
        }
        this.activityPopularity[activityLabel].add(userId)
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
