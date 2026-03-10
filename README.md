# Oraku

A TypeScript SDK for detecting behavioral patterns in activity data and generating structured findings. Built for institutions like daycares, gyms, clinics, schools, and hotels.

## What it does

You feed Oraku raw activity events. It groups them by user, runs a layered set of detectors, and returns structured findings — recurring patterns, missed activities, dormant categories, cross-user insights.

```ts
import { EventStitcher, DetectorManager } from 'oraku'

const stitcher = new EventStitcher(events)
const groups = stitcher.stitchByField('meta.userId')

const manager = new DetectorManager()
const findings = await manager.runDetectorsOn(groups)
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
DetectorManager      — run detectors, collect findings
      ↓
Finding[]            — structured output, ready for your use
```

### CLI

```bash
npm run generate:events   # generate synthetic test data
npm run stitch            # group events by userId
npm run detect            # run detectors, output findings.json
npm run reminders         # convert findings to push notifications via Groq
```

## Detectors

### Built-in

| Detector | What it detects |
|---|---|
| `ActivityPatternAnalyzer` | Recurring streaks, broken streaks, dormant categories, recent activity summary |
| `StreakDetector` | A single pattern repeating at a regular interval — predicts next occurrence or flags a missed one |
| `ChecklistDetector` | Whether a set of expected activities happened within a time window |
| `RecommendationDetector` | Cross-user activity trends — what's popular, what a specific user is missing |
| `GroqFallbackDetector` | LLM-based fallback via Groq — only runs if all primary detectors find nothing |

### Custom detectors

Register your own in one line:

```ts
import { createDetector } from 'oraku'

createDetector('MedicationCheck', 'checklist', {
  expectedItems: [{ key: 'medication', keywords: ['medication', 'medicine'] }],
  message: (missing) => `Medication log missing: ${missing.join(', ')}`
})

createDetector('WeeklyCheckup', 'streak-break', { minRepeat: 3 })
```

`DetectorManager` picks them up automatically — no registration step needed.

## Event shape

```ts
interface Event {
  externalRef?: string             // unique event ID
  category?: string                // e.g. "health"
  subcategory?: string             // e.g. "checkup"
  log?: string                     // human-readable description
  createdAt?: string               // ISO timestamp
  meta?: Record<string, unknown>   // userId, childId, or anything else
}
```

## Finding shape

```ts
interface Finding {
  id: string          // e.g. "recurring-user123-health|checkup"
  detector: string    // which detector fired
  severity: 'info' | 'warning' | 'success' | 'error'
  message: string
  evidence: Record<string, unknown>
}
```

Finding IDs follow a naming convention:
- `recurring-*` — upcoming pattern (streak ongoing)
- `anomaly-*` — missed pattern (streak broken)
- `variety-*` — dormant category
- `summary-*` — recent activity digest
- `profile-*` — user interest profile

## Grouping

Events can be grouped by any field, including nested ones:

```ts
stitcher.stitchByField('meta.userId')     // group by user
stitcher.stitchByField('meta.childId')    // group by child
stitcher.stitchByField('meta.roomId')     // group by room
```

## Detector filtering

By default, `ContextBasedFilter` decides which detectors run on each group based on event context. You can swap in your own:

```ts
const manager = new DetectorManager({
  filterMechanism: myCustomFilter,
  only: 'StreakDetector'            // run only one detector by name
})
```

## Exports

```ts
// Core
EventStitcher
DetectorManager
createDetector

// Detectors
BaseDetector
StreakDetector
ChecklistDetector
ActivityPatternAnalyzer
RecommendationDetector
GroqFallbackDetector

// Filters
BaseDetectorFilter
ContextBasedFilter

// Ingest
loadJsonRecords
loadJsonRecordsSync
stitchAndSave

// All types
Event, EventGroup, EventGroupMap
Finding, FindingData, Severity
Detector, DetectorConfig
ChecklistConfig, StreakConfig
BuiltinDetectorType
```

## Dependencies

- `dotenv` — environment variable loading
- `typescript` — TypeScript support
- `ts-node` — TypeScript execution
- `vitest` — test runner
