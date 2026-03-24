# Oraku

A TypeScript library for detecting behavioural patterns in activity data and generating structured findings. Built for institutions like daycares, gyms, clinics, schools, and hotels.

## What it does

You feed Oraku raw activity events. It groups them by user, runs a layered set of detectors, and returns structured findings — recurring patterns, missed activities, dormant categories, cross-user insights.

```ts
import { runPipeline } from 'oraku'

const result = await runPipeline(events)
// result.findings, result.notifications, result.notificationsByUser
```

## Installation

```bash
npm install oraku
```

## The Pipeline

```
Raw Events (JSON)
      ↓
EventStitcher        — group events by user (or any field)
      ↓
DetectorManager      — run detectors tier by tier, collect findings
      ↓
Finding[]            — structured output, ready for your use
```

### Detector tiers

1. **SDK detectors** — your custom `DetectorBuilder` instances, each scoped by marker
2. **ActivityPatternAnalyzer** — built-in streak, break, dormancy, and pattern detection across all events
3. **GroqFallbackDetector** — LLM-based fallback via Groq, only runs if tiers 1 and 2 find nothing

## Detectors

| Detector | What it detects |
|---|---|
| `StreakDetector` | A pattern repeating at a regular interval — predicts next occurrence or flags a missed one |
| `ChecklistDetector` | Whether a set of expected items was present in events within a time window |
| `MilestoneDetector` | Whether a user has hit specific achievement markers |
| `ThresholdDetector` | Whether a numeric value extracted from events meets a target — e.g. calories below goal |
| `ItemAnalysisDetector` | Aggregates properties of items found in events and reports which targets weren't met |
| `ActivityPatternAnalyzer` | Tier-2 built-in — recurring streaks, broken streaks, dormant categories, activity summaries |
| `RecommendationGenerator` | Cross-user activity trends — what's popular, what a specific user is missing |
| `GroqFallbackDetector` | LLM-based fallback — only runs if all primary detectors find nothing |

## Custom detectors

Use `DetectorBuilder` to wrap any detector and scope it to specific event categories via a marker expression.

```ts
import {
  DetectorBuilder,
  StreakDetector,
  ChecklistDetector,
  MilestoneDetector,
  ThresholdDetector,
  ItemAnalysisDetector
} from 'oraku'

// streak-ongoing — predicts next occurrence of a repeating pattern
const fitnessStreak = new DetectorBuilder(
  new StreakDetector({ name: 'fitness-streak', minRepeat: 3, triggerOn: 'ongoing' })
).addMarker('fitness')

// streak-break — flags when a repeating pattern stops
const routineBreak = new DetectorBuilder(
  new StreakDetector({ name: 'routine-break', minRepeat: 3, triggerOn: 'break' })
).addMarker('routine')

// checklist — fires when expected items are missing from today's events
const dailyMeds = new DetectorBuilder(
  new ChecklistDetector({
    name: 'daily-meds',
    expectedItems: [{ key: 'medication' }, { key: 'vitamins' }],
    todayOnly: true
  })
).addMarker('health')

// milestone — fires when a user hits specific achievement markers
const mealVariety = new DetectorBuilder(
  new MilestoneDetector({
    name: 'meal-variety',
    milestones: [{ key: 'salad' }, { key: 'protein' }, { key: 'fruit' }]
  })
).addMarker('meals')

// threshold — fires when a numeric value extracted from events doesn't meet a target
const calorieGoal = new DetectorBuilder(
  new ThresholdDetector({
    name: 'calorie-goal',
    extract: { path: 'meta.calories' },
    operator: 'lt',
    value: 1500,
    aggregate: 'sum'
  })
).addMarker('nutrition')

// item-analysis — looks up properties of each item, aggregates them, reports gaps
const daycareNutrition = new DetectorBuilder(
  new ItemAnalysisDetector({
    name: 'daycare-nutrition',
    extract: { path: 'meta.foodsServed' },
    lookup: {
      map: {
        apple: { protein: 0.3, vitamin_c: 8, calcium: 6 },
        milk:  { protein: 3.4, calcium: 125 }
      }
    },
    targets: { protein: 10, calcium: 200, vitamin_c: 15 }
  })
).addMarker('meals')
```

Pass builders into the pipeline:

```ts
const result = await runPipeline(events, {
  builders: [fitnessStreak, routineBreak, dailyMeds, mealVariety, calorieGoal, daycareNutrition]
})
```

## Markers

Markers filter which events each detector sees. They support boolean expressions matching against `category`, `subcategory`, `name`, `action`, or `log` fields:

```ts
builder.addMarker('fitness')                  // events where category === 'fitness'
builder.addMarker('fitness or cardio')        // either category
builder.addMarker('health and not mental')    // health events excluding mental
builder.addMarker('meals or nutrition')       // multiple categories
```

## Event shape

```ts
interface Event {
  externalRef?: string             // unique event ID
  category?: string                // e.g. 'health'
  subcategory?: string             // e.g. 'checkup'
  log?: string                     // human-readable description
  createdAt?: string               // ISO timestamp
  meta?: Record<string, unknown>   // userId, childId, or anything else
}
```

## Finding shape

```ts
interface Finding {
  id: string          // e.g. 'recurring-user123-fitness'
  detector: string    // which detector fired
  severity: 'info' | 'warning' | 'success' | 'error'
  message: string
  groupKey: string    // the user or group this finding belongs to
  evidence: Record<string, unknown>
  createdAt: string
}
```

Finding ID prefixes:
- `recurring-*` — upcoming pattern (streak ongoing)
- `anomaly-*` — missed pattern (streak broken)
- `variety-*` — dormant category
- `summary-*` — recent activity digest
- `profile-*` — user interest profile

## Grouping

Events can be grouped by any field, including nested ones:

```ts
const stitcher = new EventStitcher(events)
stitcher.stitchByField('meta.userId')     // group by user
stitcher.stitchByField('meta.childId')    // group by child
stitcher.stitchByField('meta.roomId')     // group by room
```

## Exports

```ts
// Core
runPipeline
EventStitcher
DetectorManager
schedulePipeline
loadJsonRecords, loadJsonRecordsSync

// Builder
DetectorBuilder
toBuilder
DetectorConfig

// Detectors
BaseDetector
StreakDetector
ChecklistDetector
MilestoneDetector
ThresholdDetector
ItemAnalysisDetector
ActivityPatternAnalyzer
RecommendationGenerator
GroqFallbackDetector
DetectorManager
DetectorBuilder

// Filters
BaseDetectorFilter
ContextBasedFilter

// Types
Event, EventGroup, EventGroupMap
Finding, FindingData, Severity
Detector, DetectorConfig, DetectorFilter, DetectorManagerConfig
ChecklistConfig, StreakConfig, ActivityPatternAnalyzerConfig
```

## Dependencies

- `dotenv` — environment variable loading
- `node-cron` — cron-based pipeline scheduling
- `typescript` — TypeScript support
- `ts-node` — TypeScript execution
- `vitest` — test runner
