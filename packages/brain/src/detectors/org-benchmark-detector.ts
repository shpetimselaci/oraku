import dayjs from 'dayjs'
import type { GroupDetector, EventGroupMap, Finding, PersistedUserProfile } from '../types'
import { NotificationTypes } from './helpers/notification-types'

const MIN_ORG_SIZE = 30

export class OrgBenchmarkDetector implements GroupDetector {
  name = 'org-benchmark'

  async detectAll(groups: EventGroupMap, profiles: PersistedUserProfile[]): Promise<Finding[]> {
    if (!profiles.length) return []

    const today = dayjs().format('YYYY-MM-DD')
    const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    const twoWeeksAgo = dayjs().subtract(14, 'day').format('YYYY-MM-DD')

    // group profiles by org
    const byOrg = new Map<string, PersistedUserProfile[]>()
    for (const profile of profiles) {
      if (!profile.organizationId) continue
      if (!byOrg.has(profile.organizationId)) byOrg.set(profile.organizationId, [])
      byOrg.get(profile.organizationId)!.push(profile)
    }

    const findings: Finding[] = []

    for (const [orgId, orgProfiles] of byOrg) {
      if (orgProfiles.length < MIN_ORG_SIZE) continue

      const orgRefs = new Set(orgProfiles.map(p => p.externalRef))
      const orgEntries = Object.entries(groups).filter(([ref]) => orgRefs.has(ref))
      const totalOrgUsers = orgProfiles.length  // full org size, not just users in this batch
      if (!orgEntries.length) continue

      // single pass: collect today's active categories per user + this/last week event counts
      const todayActiveByCategory: Record<string, number> = {}
      const thisWeekCounts: Record<string, number> = {}
      const lastWeekCounts: Record<string, number> = {}

      for (const [, group] of orgEntries) {
        const todayCategories = new Set<string>()
        for (const event of group.events) {
          const cat = event.category as string | undefined
          if (!cat || !event.createdAt) continue
          const d = dayjs(event.createdAt)
          if (!d.isValid()) continue
          const date = d.format('YYYY-MM-DD')
          if (date === today) todayCategories.add(cat)
          if (date >= weekAgo && date <= today) {
            thisWeekCounts[cat] = (thisWeekCounts[cat] ?? 0) + 1
          } else if (date >= twoWeeksAgo && date < weekAgo) {
            lastWeekCounts[cat] = (lastWeekCounts[cat] ?? 0) + 1
          }
        }
        for (const cat of todayCategories) {
          todayActiveByCategory[cat] = (todayActiveByCategory[cat] ?? 0) + 1
        }
      }

      const todayRates: Record<string, number> = {}
      for (const [cat, count] of Object.entries(todayActiveByCategory)) {
        todayRates[cat] = Math.round((count / totalOrgUsers) * 100)
      }

      const topThisWeek = Object.entries(thisWeekCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))

      // union of keys from both weeks so categories that went silent this week are included
      const allTrendingCategories = new Set([...Object.keys(thisWeekCounts), ...Object.keys(lastWeekCounts)])
      const trending = Array.from(allTrendingCategories)
        .map((cat) => {
          const thisCount = thisWeekCounts[cat] ?? 0
          const lastCount = lastWeekCounts[cat] ?? 0
          // if there was no activity last week, treat this week as 100% growth (new activity)
          const change = lastCount > 0 ? (thisCount - lastCount) / lastCount : 1
          return { category: cat, change: Math.round(change * 100), direction: change >= 0 ? 'up' : 'down' }
        })
        .filter(t => Math.abs(t.change) >= 20)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 2)

      // emit one finding per user in this org
      for (const profile of orgProfiles) {
        if (!groups[profile.externalRef]) continue
        findings.push({
          id: `org-benchmark-${profile.externalRef}-${today}`,
          detector: 'org-benchmark',
          notificationType: NotificationTypes.INSIGHT,
          message: `Organisation activity update`,
          groupKey: profile.externalRef,
          evidence: {
            organizationId: orgId,
            organizationName: profile.organizationName,
            orgSize: totalOrgUsers,
            todayRates,
            topThisWeek,
            trending
          }
        })
      }
    }

    return findings
  }
}
