/**
 * OAP (Oraku Activity Pipeline) — Full SDK Reference
 *
 * This file is a commented walkthrough of every major concept in the SDK.
 * It is not meant to run as-is — treat each section as a standalone snippet.
 *
 * Contents:
 *   1.  Events & EventGroups — the raw data shape
 *   2.  runPipeline — the main entry point
 *   3.  DetectorBuilder — wrapping a detector for the pipeline
 *   4.  addMarker — filtering which events a detector sees
 *   5.  compose — combining two builders into one
 *   6.  clone — forking a builder without mutating the original
 *   7.  StreakDetector — recurring pattern detection
 *   8.  ChecklistDetector — daily / periodic item coverage
 *   9.  MilestoneDetector — one-time achievement detection
 *  10.  ThresholdDetector — numeric threshold crossing
 *  11.  ItemAnalysisDetector — per-item property lookup + targets
 *  12.  toBuilder — JSON-driven detector construction
 *  13.  Notifications — reading and marking due notifications
 */

import {
  runPipeline,
  DetectorBuilder,
  StreakDetector,
  ChecklistDetector,
  MilestoneDetector,
  ThresholdDetector,
  ItemAnalysisDetector,
  toBuilder,
  getDueNotifications,
  markDelivered,
} from 'oraku'
import type { Event } from 'oraku'


// ─── 1. Events & EventGroups ──────────────────────────────────────────────────
//
// An Event is the atomic unit of data. Every event must have:
//   - externalRef  : the user it belongs to (groups events per-user)
//   - createdAt    : ISO 8601 timestamp ("2024-03-15T09:30:00Z")
//
// Optional but commonly used:
//   - category     : broad label  ("nutrition", "exercise", "medication")
//   - subcategory  : narrower label ("breakfast", "running", "ibuprofen")
//   - name / log   : free-text description of what happened
//   - meta         : any extra structured data (nutrients, distance, userId, etc.)
//
// Events are fed into the pipeline as a flat array — the pipeline stitches them
// into per-user EventGroups automatically via EventStitcher.

const sampleEvents: Event[] = [
  {
    externalRef: 'user-123',
    createdAt: '2024-03-15T07:30:00Z',
    category: 'nutrition',
    subcategory: 'breakfast',
    name: 'Oatmeal with berries',
    meta: { protein: 8, calories: 320 }
  },
  {
    externalRef: 'user-123',
    createdAt: '2024-03-15T18:00:00Z',
    category: 'exercise',
    subcategory: 'running',
    name: '5km morning run',
    meta: { distanceKm: 5, durationMin: 28 }
  },
  {
    externalRef: 'user-456',
    createdAt: '2024-03-15T08:00:00Z',
    category: 'medication',
    subcategory: 'morning-dose',
    name: 'Vitamin D + Omega 3',
  }
]


// ─── 2. runPipeline — the main entry point ───────────────────────────────────
//
// Pass events + a list of DetectorBuilders. The pipeline:
//   1. Stitches events into per-user groups
//   2. Runs your SDK detectors (tier 1)
//   3. Falls back to ActivityPatternAnalyzer if tier 1 finds nothing (tier 2)
//   4. Falls back to LLMDetector if tier 2 also finds nothing (tier 3)
//   5. Calls generateNotifications on all findings
//   6. Saves notifications to the DB and returns them
//
// Options:
//   builders           — your DetectorBuilder instances
//   notificationsPerUser — max notifications to send per user per run (default 1)
//   forUserId          — only run for one specific user (useful for on-demand runs)
//   provider           — custom LLMProvider (defaults to env-configured ChatProvider)
//   subjectMap         — maps externalRef → subject name for notification copy

async function basicPipelineExample() {
  const result = await runPipeline(sampleEvents, {
    builders: [
      // builders are defined in the sections below
    ],
    notificationsPerUser: 2,
  })

  console.log('findings:', result.count)          // actionable finding count (excludes summaries)
  console.log('all findings:', result.findings)   // full Finding[] array
  console.log('notifications:', result.notifications) // flat Notification[] across all users
  console.log('by user:', result.notificationsByUser) // Record<userId, Notification[]>
}


// ─── 3. DetectorBuilder — wrapping a detector ────────────────────────────────
//
// You never pass a detector directly to the pipeline — always wrap it in a
// DetectorBuilder first. The builder is where you attach markers (event filters)
// and compose multiple detectors together.
//
// Pattern:  new DetectorBuilder(detector)  →  add markers  →  pass to pipeline

const medicationChecklist = new ChecklistDetector({
  name: 'MedicationChecklist',
  notificationType: 'reminder',
  expectedItems: [
    { key: 'morning-dose' },
    { key: 'evening-dose' },
  ],
  // extract the subcategory from each event to compare against expectedItems
  extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '',
  message: (missing) => `Medication not yet logged: ${missing.join(', ')}`,
  todayOnly: true,
})

// Wrap in a builder — no markers yet, so it sees all events for the user
const medicationBuilder = new DetectorBuilder(medicationChecklist)


// ─── 4. addMarker — filtering which events a detector sees ───────────────────
//
// Markers are boolean expressions evaluated against each event before the
// detector runs. Events that don't match are invisible to the detector.
//
// Supported syntax:
//   category:nutrition            — event.category === 'nutrition'
//   subcategory:breakfast         — event.subcategory === 'breakfast'
//   "category:exercise"           — quotes are optional
//   category:nutrition or category:exercise   — OR logic
//   category:nutrition and subcategory:breakfast — AND logic
//   not category:nutrition        — negation
//   (category:a or category:b) and subcategory:c  — parentheses for grouping
//
// addMarker is chainable. Multiple calls are ANDed together.
// This means: addMarker('A').addMarker('B') === addMarker('A and B')

const nutritionChecklist = new ChecklistDetector({
  name: 'MealChecklist',
  notificationType: 'nudge',
  expectedItems: [
    { key: 'breakfast' },
    { key: 'lunch' },
    { key: 'dinner' },
  ],
  extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '',
  message: (missing) => `Meals not logged yet: ${missing.join(', ')}`,
  todayOnly: true,
})

const mealBuilder = new DetectorBuilder(nutritionChecklist)
  // only show this detector events in the 'nutrition' category
  .addMarker('category:nutrition')

const exerciseStreak = new StreakDetector({
  name: 'ExerciseStreak',
  notificationType: 'reminder',
  minRepeat: 3,
  triggerOn: 'ongoing',
  frequency: 'daily',
})

const exerciseBuilder = new DetectorBuilder(exerciseStreak)
  // only running or cycling events
  .addMarker('subcategory:running or subcategory:cycling')


// ─── 5. compose — combining two builders into one ────────────────────────────
//
// compose() merges two builders so their detectors both run on the same group.
// Each entry keeps its own markers — they don't interfere with each other.
// The resulting builder emits findings from both detectors.
//
// Use this when you want to register multiple detectors as a single logical unit
// (e.g. pass one combined builder to the pipeline instead of two).

const combinedBuilder = mealBuilder.compose(exerciseBuilder)
// combinedBuilder will run MealChecklist (nutrition-only) AND ExerciseStreak (running/cycling-only)


// ─── 6. clone — forking a builder without mutating the original ──────────────
//
// clone() creates an independent deep copy of the builder.
// Markers added to the clone don't affect the original, and vice versa.
//
// Useful pattern: build a "base" detector, then clone it for different contexts.

const baseStreakBuilder = new DetectorBuilder(
  new StreakDetector({ name: 'RoutineStreak', minRepeat: 5, triggerOn: 'ongoing', frequency: 'weekdays' })
)

// Fork for medication — only sees medication events
const medicationStreakBuilder = baseStreakBuilder.clone().addMarker('category:medication')

// Fork for exercise — only sees exercise events
const exerciseStreakBuilder = baseStreakBuilder.clone().addMarker('category:exercise')

// The original baseStreakBuilder is unchanged — no markers, sees all events
// All three can be passed to the pipeline independently


// ─── 7. StreakDetector ────────────────────────────────────────────────────────
//
// Detects repeated patterns across days. Groups events by category+subcategory
// and tracks how often each pattern appears.
//
// Config:
//   minRepeat    — minimum occurrences before the streak is considered valid (default 3)
//   triggerOn    — 'ongoing': fires when the next occurrence is predicted soon
//                  'break':   fires when the predicted occurrence is overdue
//   frequency    — 'daily' | 'weekdays' | 'weekly' | 'monthly'
//                  'weekdays' skips Sat/Sun for both prediction and break detection
//   precision    — 'day' (default): one occurrence per day counts
//                  'time': full timestamp precision (good for medication schedules)
//   message      — optional formatter: (pattern: string) => string
//                  {{next}} in the string is replaced with the predicted date
//
// Evidence includes:
//   predicted / expected  — ISO timestamp of the next predicted occurrence
//   events                — last 20 events in the pattern (capped)
//   streakLength          — how many deduplicated days are in the streak
//   frequency             — the frequency setting

const dailyMedicationStreak = new StreakDetector({
  name: 'MedicationRoutine',
  notificationType: 'reminder',
  minRepeat: 3,
  triggerOn: 'ongoing',    // fire when next occurrence is coming up
  frequency: 'daily',
  precision: 'time',       // for medication, exact time matters
  message: (pattern) => `Time for ${pattern} — predicted next dose: {{next}}`,
})

const workoutBreakAlert = new StreakDetector({
  name: 'WorkoutMissed',
  notificationType: 'warning',
  minRepeat: 5,
  triggerOn: 'break',      // fire when the routine has been broken
  frequency: 'weekdays',   // won't fire on weekends
})


// ─── 8. ChecklistDetector ────────────────────────────────────────────────────
//
// Checks whether a set of expected items all appeared in a time window.
// Fires when one or more items are missing.
//
// Config:
//   expectedItems  — list of { key, keywords?, match?, api? } objects
//   extractActual  — function that returns item key(s) from an event
//   compareFn      — async override for the entire comparison step (e.g. API-backed)
//   message        — string or (missing: string[]) => string
//   todayOnly      — only look at today's events (default true)
//   dateFilter     — { unit, value } to look at a longer window; self-gates to
//                    end of period (week fires on Friday, month fires on last day)
//   aggregate      — if true, collects items across all users before checking
//                    (use for org-level checklists)
//
// Evidence includes:
//   checked   — all items extracted from events
//   covered   — items that matched expectedItems
//   missing   — items that didn't match

const weeklyCheckup = new ChecklistDetector({
  name: 'WeeklyHealthCheckup',
  notificationType: 'reminder',
  expectedItems: [
    { key: 'weight' },
    { key: 'blood-pressure' },
    { key: 'steps-goal' },
  ],
  extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '',
  message: (missing) => `Weekly health checks still needed: ${missing.join(', ')}`,
  todayOnly: false,
  dateFilter: { unit: 'week', value: 1 }, // looks back 1 week; only fires on Fridays
})


// ─── 9. MilestoneDetector ────────────────────────────────────────────────────
//
// Fires once when ALL expected milestones have been achieved. Unlike ChecklistDetector
// it's a positive detector — it fires on success, not on gaps.
//
// Config:
//   milestones    — list of { key, keywords?, match? } to look for
//   extractActual — same as ChecklistDetector
//   message       — string or (achieved: string[]) => string
//   todayOnly     — only look at today's events (default true)
//
// The finding has permanent: true in evidence — the pipeline marks it as a
// permanent notification so it isn't re-fired on subsequent runs.

const dailyGoalMilestone = new MilestoneDetector({
  name: 'DailyGoalComplete',
  notificationType: 'achievement',
  milestones: [
    { key: 'breakfast' },
    { key: 'exercise' },
    { key: 'water-intake' },
  ],
  extractActual: (event) => typeof event.subcategory === 'string' ? event.subcategory : '',
  message: (achieved) => `Daily goals complete! Logged: ${achieved.join(', ')}`,
  todayOnly: true,
})


// ─── 10. ThresholdDetector ───────────────────────────────────────────────────
//
// Fires when a numeric aggregate of event values crosses a threshold.
//
// Config:
//   extract    — { path: 'meta.calories' } or (event) => number | null
//   operator   — 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
//   value      — the threshold number
//   aggregate  — 'sum' (default) | 'avg' | 'count' | 'min' | 'max'
//   todayOnly  — only use today's events (default true)
//   message    — string or (actual, target) => string
//
// Evidence includes:
//   actual     — computed aggregate value
//   target     — the threshold value
//   operator   — which comparison was used
//   aggregate  — which aggregation was used

const lowProteinAlert = new ThresholdDetector({
  name: 'LowProtein',
  notificationType: 'warning',
  extract: { path: 'meta.protein' },  // reads event.meta.protein
  operator: 'lt',
  value: 50,                           // fires if total protein today < 50g
  aggregate: 'sum',
  todayOnly: true,
  message: (actual, target) => `Protein is low today — only ${actual.toFixed(0)}g of the ${target}g goal`,
})

const highStepCount = new ThresholdDetector({
  name: 'StepGoalReached',
  notificationType: 'achievement',
  extract: (event) => {
    // custom extractor — can handle any event shape
    const steps = (event.meta as Record<string, unknown>)?.steps
    return typeof steps === 'number' ? steps : null
  },
  operator: 'gte',
  value: 10000,
  aggregate: 'sum',
  todayOnly: true,
  message: (actual) => `${actual.toLocaleString()} steps today — goal reached!`,
})


// ─── 11. ItemAnalysisDetector ─────────────────────────────────────────────────
//
// Extracts item names from events, looks up their properties (via a static map
// or an API), aggregates the properties, then fires if any target isn't met.
//
// Designed for nutrient tracking: extract food names → look up protein/calories →
// sum them → compare against daily targets.
//
// Config:
//   extract      — path string or function returning item name(s) per event
//   lookup       — { map: {...} } for static data, or { api: {...} } for live lookups
//   targets      — { protein: 50, calories: 2000 } — property → minimum target
//   aggregate    — 'sum' (default) | 'avg'
//   todayOnly    — default false (unlike other detectors)
//   dateFilter   — optional time window
//   message      — (gaps, totals, targets) => string
//
// Evidence includes:
//   itemsAnalyzed — unique item names found
//   totals         — { protein: 34, calories: 1200, ... }
//   targets        — your target values
//   gaps           — properties that didn't reach their target

const nutritionAnalysis = new ItemAnalysisDetector({
  name: 'NutritionTargets',
  notificationType: 'insight',
  extract: { path: 'name' },   // reads event.name as the food item
  lookup: {
    // static map: food name → property values
    map: {
      'oatmeal with berries': { protein: 8, calories: 320, fiber: 6 },
      'grilled chicken':      { protein: 35, calories: 280, fiber: 0 },
      'greek yogurt':         { protein: 17, calories: 130, fiber: 0 },
    }
    // OR use an API:
    // api: {
    //   urlTemplate: 'https://nutrition-api.example.com/foods/{item}',
    //   responsePath: 'nutrients',          // path into the response JSON
    //   timeout: 3000,
    // }
  },
  targets: {
    protein: 50,    // fire if total protein < 50g
    fiber: 25,      // fire if total fiber < 25g
  },
  aggregate: 'sum',
  todayOnly: true,
  message: (gaps, totals, targets) =>
    `Targets not met: ${gaps.map(g => `${g} (${totals[g]?.toFixed(0) ?? 0}/${targets[g]})`).join(', ')}`,
})

// Attach a marker so it only sees nutrition events
const nutritionBuilder = new DetectorBuilder(nutritionAnalysis)
  .addMarker('category:nutrition')


// ─── 12. toBuilder — JSON-driven detector construction ───────────────────────
//
// toBuilder() builds a DetectorBuilder from a plain JSON config object.
// Useful for loading detector definitions from a database or config file
// without writing TypeScript for each one.
//
// Supported types:
//   'streak-ongoing'  → StreakDetector { triggerOn: 'ongoing' }
//   'streak-break'    → StreakDetector { triggerOn: 'break' }
//   'checklist'       → ChecklistDetector
//   'milestone'       → MilestoneDetector
//   'threshold'       → ThresholdDetector (requires extract.path, operator, value)
//   'item-analysis'   → ItemAnalysisDetector (requires extract.path, lookup, targets)
//
// The 'marker' field is optional — behaves exactly like addMarker().
// 'scheduleAt' is a HH:MM string — the notification is held until that time of day.

const jsonDefinedBuilder = toBuilder({
  name: 'MorningMedication',
  type: 'checklist',
  marker: 'category:medication',
  notificationType: 'reminder',
  expected: ['morning-dose'],
  todayOnly: true,
  scheduleAt: '08:00',   // notification won't surface until 8am
})

const jsonStreakBuilder = toBuilder({
  name: 'WeekdayWorkout',
  type: 'streak-break',
  marker: 'category:exercise',
  notificationType: 'warning',
  minRepeat: 5,
  precision: 'day',
})


// ─── 13. Putting it all together — a real pipeline call ──────────────────────

async function runDailyPipeline(events: Event[]) {
  const result = await runPipeline(events, {
    builders: [
      mealBuilder,
      medicationBuilder,
      exerciseBuilder,
      nutritionBuilder,
      new DetectorBuilder(lowProteinAlert).addMarker('category:nutrition'),
      new DetectorBuilder(dailyGoalMilestone),
      new DetectorBuilder(dailyMedicationStreak).addMarker('category:medication'),
      new DetectorBuilder(workoutBreakAlert).addMarker('category:exercise'),
      jsonDefinedBuilder,
    ],
    notificationsPerUser: 3,
    // subjectMap maps externalRef → child/subject name for notification copy
    // e.g. "Emma's breakfast is logged" vs "Your breakfast is logged"
    subjectMap: {
      'user-123': 'Emma',
      'user-456': 'Liam',
    },
  })

  return result
}




// ─── 15. Notifications — reading and delivering ───────────────────────────────
//
// After runPipeline, notifications are saved to the DB.
// getDueNotifications() returns all notifications that are due now
// (i.e. scheduledAt is in the past or unset, and not yet delivered).
//
// Notifications have:
//   ref       — the externalRef they target (may differ from the user who owns them)
//   message   — the generated push notification text
//   type      — 'reminder' | 'warning' | 'achievement' | 'insight' | 'nudge' | 'suggestion'
//   detector  — which detector generated it
//   scheduledAt — optional ISO timestamp; present if scheduleAt was set on the detector
//   permanent — true if the notification should persist (e.g. milestone achievements)
//
// markDelivered(id) marks a notification as sent so it won't be returned again.

async function deliverNotifications(userId: string) {
  const due = await getDueNotifications(userId)
  for (const notification of due) {
    // send to your push provider
    console.log(`[${notification.type}] → ${notification.ref}: ${notification.message}`)
    await markDelivered(notification.id)
  }
}
