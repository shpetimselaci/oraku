"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationDetector = void 0;
const NAME = 'RecommendationDetector';
// Aggregate data across all entries
const userProfiles = {};
const activityPopularity = {};
exports.RecommendationDetector = {
    name: NAME,
    description: 'Generates user profiles and activity recommendations',
    dataSource: null,
    severity: 'info',
    aggregate: true, // processes all entries, outputs at end
    async detect(entry) {
        const events = entry?.events || [];
        for (const event of events) {
            // Get userId from event metadata - skip if no valid user
            const meta = event.meta;
            const userId = meta?.userId || meta?.user_id || event.userId;
            if (!userId || typeof userId !== 'string')
                continue;
            // Initialize user profile
            if (!userProfiles[userId]) {
                userProfiles[userId] = { interests: {}, activities: new Set() };
            }
            const profile = userProfiles[userId];
            // Track interests by category/subcategory
            const category = event.subcategory || event.category || 'general';
            profile.interests[category] = (profile.interests[category] || 0) + 1;
            // Track specific activities
            const activity = event.name || event.log || event.title;
            if (activity) {
                profile.activities.add(activity);
                if (!activityPopularity[activity]) {
                    activityPopularity[activity] = new Set();
                }
                activityPopularity[activity].add(userId);
            }
        }
        return []; // findings generated in finalize()
    },
    async finalize() {
        const users = Object.keys(userProfiles);
        if (!users.length)
            return [];
        const findings = [];
        // Find popular activities (done by multiple users or frequently by one)
        const popularActivities = Object.entries(activityPopularity)
            .map(([activity, userSet]) => ({ activity, popularity: userSet.size }))
            .sort((a, b) => b.popularity - a.popularity);
        // Generate profile for each user
        for (const [userId, profile] of Object.entries(userProfiles)) {
            const topInterests = Object.entries(profile.interests)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, count]) => `${cat}(${count})`);
            // Find activities this user hasn't tried (if we have multiple users)
            const suggestions = users.length > 1
                ? popularActivities
                    .filter(({ activity }) => !profile.activities.has(activity))
                    .slice(0, 3)
                    .map((s) => `${s.activity} (${s.popularity}/${users.length} users)`)
                : [];
            const findingData = {
                userId,
                totalActivities: profile.activities.size,
                topInterests,
                activitiesList: [...profile.activities].slice(0, 10)
            };
            if (suggestions.length) {
                findingData.suggestions = suggestions;
            }
            findings.push({
                id: `profile-${userId}`,
                detector: NAME,
                severity: 'info',
                message: `👤 User Profile: ${userId.slice(0, 8)}...`,
                evidence: findingData
            });
        }
        // Add summary
        findings.unshift({
            id: 'engagement-summary',
            detector: NAME,
            severity: 'info',
            message: `📊 Engagement: ${users.length} user(s), ${Object.keys(activityPopularity).length} activities tracked`,
            evidence: {
                totalUsers: users.length,
                totalActivities: Object.keys(activityPopularity).length,
                topActivities: popularActivities.slice(0, 5).map((p) => p.activity)
            }
        });
        return findings;
    }
};
exports.default = exports.RecommendationDetector;
//# sourceMappingURL=RecommendationDetector.js.map