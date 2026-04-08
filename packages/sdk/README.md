# oraku-sdk

SDK for the Oraku engagement engine. Send activity events from your app, register custom detectors for your domain, and get back personalised push notifications driven by behavioural pattern detection.

---

## Install

```bash
npm install oraku-sdk
```

---

## Setup

```ts
import OrakuSDK from 'oraku-sdk'

const oraku = new OrakuSDK({
  apiUrl: 'https://your-oraku-api.com',
  apiKey: 'your-api-key'
})
```

| Option   | Type   | Description                         |
| -------- | ------ | ----------------------------------- |
| `apiUrl` | string | Base URL of your Oraku API instance |
| `apiKey` | string | Your project API key                |

---

## Methods

### `loadInformation(events)`

Sends activity events to the Oraku engine. Events are grouped by `externalRef`, pattern detectors run per group, and results are stored ready to be pulled as notifications.

```ts
await oraku.loadInformation([
  {
    externalRef: 'user-123',
    category: 'fitness',
    subcategory: 'cardio',
    log: '5km morning run',
    createdAt: '2026-03-13T07:30:00Z',
    meta: {
      username: 'Emma'
    }
  }
])
```

**Event fields:**

| Field         | Type              | Description                                                                                     |
| ------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `externalRef` | string            | Groups events by user — pass a userId, session ID, or any identifier. Required for routing.     |
| `category`    | string            | Top-level activity type (e.g. `fitness`, `meals`, `health`)                                     |
| `subcategory` | string            | More specific type (e.g. `cardio`, `lunch`, `checkup`)                                          |
| `log`         | string            | Human-readable description of what happened                                                     |
| `createdAt`   | string (ISO 8601) | When the event occurred — critical for streak and pattern detection                             |
| `meta`        | object            | Arbitrary metadata. `meta.username` is used in notification copy.                               |

> **Important:** `externalRef` is how the engine groups events per user. All events for the same user must share the same `externalRef`.

---

### `generateEngagementPulls(filter, options?)`

Fetches notifications generated from the last `loadInformation` call, optionally filtered to a specific user.

```ts
const notifications = await oraku.generateEngagementPulls(
  { externalRef: 'user-123' },
  { limit: 3 }
)
// [{ ref: 'user-123', detector: 'StreakDetector', type: 'reminder', message: "You've hit a 7-day fitness streak — keep it going." }, ...]
```

Returns `Notification[]` — each object is a ready-to-send push notification.

```ts
interface Notification {
  ref: string       // the externalRef this notification is for
  detector: string  // which detector produced it
  type: string      // notification type: reminder | warning | insight | etc.
  message: string   // the notification copy
}
```

| Field         | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `externalRef` | string | The user to fetch notifications for          |
| `limit`       | number | Max number of notifications to return        |

---

### `detectors.add(builder)`

Registers a custom detector for your project. Use `DetectorBuilder` to define what to detect and which events it should see. Detectors are stored server-side and applied automatically on every `loadInformation` call.

```ts
import { DetectorBuilder } from 'oraku-sdk'
```

**One instance per detector type:**

```ts
// streak-ongoing — predicts next occurrence of a repeating pattern
const fitnessStreak = new DetectorBuilder('fitness-streak', 'streak-ongoing')
  .addMarker('fitness')
  .minRepeat(3)
  .notificationType('reminder')

// streak-break — flags when a repeating pattern stops
const routineBreak = new DetectorBuilder('routine-break', 'streak-break')
  .addMarker('routine')
  .minRepeat(3)
  .notificationType('warning')

// checklist — fires when expected items are missing from today's events
const dailyMeds = new DetectorBuilder('daily-meds', 'checklist')
  .addMarker('health')
  .expected(['medication', 'vitamins'])
  .todayOnly()
  .notificationType('warning')

// milestone — fires when a user hits specific achievement markers
const mealVariety = new DetectorBuilder('meal-variety', 'milestone')
  .addMarker('meals')
  .expected(['salad', 'protein', 'fruit'])
  .notificationType('achievement')

// threshold — fires when a numeric value extracted from events doesn't meet a target
const calorieGoal = new DetectorBuilder('calorie-goal', 'threshold')
  .addMarker('nutrition')
  .extract({ path: 'meta.calories' })
  .operator('lt')
  .value(1500)
  .aggregate('sum')
  .notificationType('warning')

// item-analysis — looks up properties of each item, aggregates them, reports gaps
const daycareNutrition = new DetectorBuilder('daycare-nutrition', 'item-analysis')
  .addMarker('meals')
  .extract({ path: 'meta.foodsServed' })
  .lookup({
    map: {
      apple: { protein: 0.3, vitamin_c: 8, calcium: 6 },
      milk:  { protein: 3.4, calcium: 125 }
    }
    // or use an API:
    // api: { urlTemplate: 'https://nutrition-api.com/food?name={item}', responsePath: 'nutrients' }
  })
  .targets({ protein: 10, calcium: 200, vitamin_c: 15 })
  .notificationType('nudge')
  .scheduleAt('16:00')  // deliver at 16:00 UTC instead of the default for this notification type

await oraku.detectors.add(fitnessStreak)
await oraku.detectors.add(routineBreak)
await oraku.detectors.add(dailyMeds)
await oraku.detectors.add(mealVariety)
await oraku.detectors.add(calorieGoal)
await oraku.detectors.add(daycareNutrition)
```

**Builder methods:**

| Method                   | Type                                              | Description                                                |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| `addMarker(expr)`        | string                                            | Filter which events this detector sees (see Markers below) |
| `notificationType(type)` | `reminder` \| `warning` \| `nudge` \| `suggestion` \| `achievement` \| `insight` | Type of notification produced |
| `minRepeat(n)`           | number                                            | Minimum consecutive occurrences to trigger (streak types)  |
| `expected(items)`        | string[]                                          | Items expected to be present (checklist / milestone)       |
| `todayOnly()`            | —                                                 | Only consider events from today                            |
| `extract(config)`        | `{ path: string }`                                | Dot-notation path to extract a value from events           |
| `operator(op)`           | `lt` \| `lte` \| `gt` \| `gte` \| `eq`           | Comparison direction for threshold detectors               |
| `value(n)`               | number                                            | Target value to compare against                            |
| `aggregate(fn)`          | `sum` \| `avg` \| `count` \| `min` \| `max`       | How to combine values across events                        |
| `lookup(config)`         | `{ map?, api? }`                                  | Where to look up item properties (item-analysis)           |
| `targets(map)`           | `Record<string, number>`                          | Minimum required value per property (item-analysis)        |
| `scheduleAt(time)`       | string (e.g. `'16:00'`)                           | UTC time to deliver the notification — overrides the default for the notification type |

## Markers

Markers filter which events a detector sees. They support boolean expressions matching against any string field of the event:

```ts
.addMarker('fitness')                // events where any field === 'fitness'
.addMarker('fitness or cardio')      // either value
.addMarker('health and not mental')  // health events excluding mental
.addMarker('meals or nutrition')     // multiple categories
```

Without a marker, the detector runs against all events.

---

### `detectors.remove(name)`

Removes a registered detector by name.

```ts
await oraku.detectors.remove('fitness-streak')
```

---

### `project.setSettings(settings)`

Stores a webhook URL for your project. When set, Oraku pushes notifications to your endpoint instead of waiting to be polled.

```ts
await oraku.project.setSettings({
  webhookUrl: 'https://yourapp.com/oraku-webhook',
  webhookAuthKey: 'optional-secret'
})
```

---

### `project.setCron(cron)`

Configures a schedule for Oraku to automatically run the pipeline on a recurring basis.

```ts
await oraku.project.setCron({ cron: '0 9 * * *' })
```

---

## How it works

```
Your app
  → loadInformation(events)
      → events grouped by externalRef
      → custom detectors run (scoped by marker)
      → ActivityPatternAnalyzer runs as fallback
      → findings converted to personalised notifications
  → generateEngagementPulls({ externalRef: userId })
      → returns that user's notifications as Notification[]
```

Notifications are scoped per user — each user only receives notifications based on their own activity history. The engine handles all detection and copy generation; you just send events and display the output.
