import { BaseDetector } from './BaseDetector'
import type { EventGroup, Finding, UserProfile, ActivityPopularity } from '../types'
import { NotificationTypes } from './helpers/notificationTypes'

const MAX_GAP_SUGGESTIONS = 3
const MAX_NAMES_PER_GAP = 2
const MAX_TOP_CATEGORIES = 3
const MAX_ACTIVITIES_IN_EVIDENCE = 10
const MAX_CATEGORIES_IN_MESSAGE = 2
const MAX_TOP_ACTIVITIES_IN_SUMMARY = 3

export class RecommendationGenerator extends BaseDetector {
  private userProfiles: Record<string, UserProfile> = {}
  private usernames: Record<string, string> = {}
  private activityPopularity: Record<string, Set<string>> = {}

  constructor() {
    super({
      name: 'RecommendationGenerator',
      notificationType: NotificationTypes.SUGGESTION,
      description: 'Builds user profiles and generates activity recommendations'
    })
  }

  async detect(entry: EventGroup): Promise<Finding[]> {
    const userId = entry.externalRef
    const events = entry?.events || []
    if (!userId || !events.length) return []

    if (!this.userProfiles[userId]) {
      this.userProfiles[userId] = { interests: {}, activities: new Set() }
      const firstMeta = events[0]?.meta as Record<string, unknown> | undefined
      const username = firstMeta?.username as string | undefined
        ?? firstMeta?.name as string | undefined
        ?? firstMeta?.displayName as string | undefined
      this.usernames[userId] = username ?? userId
    }

    const profile = this.userProfiles[userId]

    for (const event of events) {
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
            .slice(0, MAX_GAP_SUGGESTIONS)
            .map(suggestion => {
              const otherNames = [...this.activityPopularity[suggestion.activity]]
                .map(otherUserId => this.usernames[otherUserId] ?? otherUserId)
                .filter(name => name !== displayName)
                .slice(0, MAX_NAMES_PER_GAP)
              return `${suggestion.activity} (logged by ${otherNames.join(', ')})`
            })
        : []

      const topCategories = Object.entries(profile.interests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TOP_CATEGORIES)
        .map(([category, count]) => `${category} (${count}x)`)

      const evidenceData: Record<string, unknown> = {
        userId,
        username: displayName,
        totalLogged: profile.activities.size,
        mostLoggedCategories: topCategories,
        loggedActivities: [...profile.activities].slice(0, MAX_ACTIVITIES_IN_EVIDENCE)
      }

      if (gaps.length) evidenceData.notYetLoggedByThisUser = gaps

      findings.push(this.createFinding({
        id: `profile-${userId}`,
        groupKey: userId,
        message: `${displayName} has logged ${profile.activities.size} unique activities — most in: ${topCategories.slice(0, MAX_CATEGORIES_IN_MESSAGE).join(', ') || 'none yet'}`,
        evidence: evidenceData
      }))
    }

    const topActivities = popularActivities.slice(0, MAX_TOP_ACTIVITIES_IN_SUMMARY).map(p => p.activity)
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
