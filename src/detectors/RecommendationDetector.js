const BaseDetector = require('./BaseDetector')

const NAME = 'RecommendationDetector'

// Aggregate data across all entries
const userProfiles = {}  // userId -> { interests: { category: count }, activities: Set }
const activityPopularity = {}  // activity -> count of users who did it

module.exports = {
  name: NAME,
  aggregate: true,  // processes all entries, outputs at end

  async detect(entry) {
    const events = entry?.events || []
    
    for (const event of events) {
      // Get userId from event metadata - skip if no valid user
      const userId = event.meta?.userId || event.meta?.user_id || event.userId
      if (!userId) continue
      
      // Initialize user profile
      if (!userProfiles[userId]) {
        userProfiles[userId] = { interests: {}, activities: new Set() }
      }
      
      const profile = userProfiles[userId]
      
      // Track interests by category/subcategory
      const category = event.subcategory || event.category || 'general'
      profile.interests[category] = (profile.interests[category] || 0) + 1
      
      // Track specific activities
      const activity = event.name || event.log || event.title
      if (activity) {
        profile.activities.add(activity)
        activityPopularity[activity] = activityPopularity[activity] || new Set()
        activityPopularity[activity].add(userId)
      }
    }
    
    return []  // findings generated in finalize()
  },

  finalize() {
    const users = Object.keys(userProfiles)
    if (!users.length) return []
    
    const findings = []
    
    // Find popular activities (done by multiple users or frequently by one)
    const popularActivities = Object.entries(activityPopularity)
      .map(([activity, userSet]) => ({ activity, popularity: userSet.size }))
      .sort((a, b) => b.popularity - a.popularity)
    
    // Generate profile for each user
    for (const [userId, profile] of Object.entries(userProfiles)) {
      const topInterests = Object.entries(profile.interests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count})`)
      
      // Find activities this user hasn't tried (if we have multiple users)
      const suggestions = users.length > 1
        ? popularActivities
            .filter(({ activity }) => !profile.activities.has(activity))
            .slice(0, 3)
            .map(s => `${s.activity} (${s.popularity}/${users.length} users)`)
        : []
      
      findings.push({
        id: `profile-${userId}`,
        key: userId,
        detector: NAME,
        severity: 'info',
        message: `👤 User Profile: ${userId.slice(0, 8)}...`,
        data: {
          userId,
          totalActivities: profile.activities.size,
          topInterests,
          activitiesList: [...profile.activities].slice(0, 10),
          ...(suggestions.length && { suggestions })
        }
      })
    }
    
    // Add summary
    findings.unshift({
      id: 'engagement-summary',
      key: 'engagement-summary',
      detector: NAME,
      severity: 'info',
      message: `📊 Engagement: ${users.length} user(s), ${Object.keys(activityPopularity).length} activities tracked`,
      data: {
        totalUsers: users.length,
        totalActivities: Object.keys(activityPopularity).length,
        topActivities: popularActivities.slice(0, 5).map(p => p.activity)
      }
    })
    
    return findings
  }
}
