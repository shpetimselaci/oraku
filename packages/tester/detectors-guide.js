const { DetectorBuilder } = require('oraku-sdk')


// ─── Creating a detector ──────────────────────────────────────────────────────
//
// new DetectorBuilder(name, type)
//
// Types: 'streak-ongoing'  'streak-break'  'checklist'  'milestone'  'threshold'  'item-analysis'

const streak = new DetectorBuilder('learning-streak', 'streak-ongoing')
  .minRepeat(3)                 // needs 3+ past occurrences to fire
  .notificationType('reminder')


// ─── addMarker — filter which events the detector sees ───────────────────────
//
// Without a marker the detector sees all events.
// With a marker it only sees events that match.
//
//   'learning'                          →  category === 'learning'
//   'category:meals'                    →  category === 'meals'
//   'category:meals and subcategory:lunch'
//   'learning or activities'
//   'not category:health'

const learningStreak = new DetectorBuilder('learning-streak', 'streak-ongoing')
  .minRepeat(3)
  .notificationType('reminder')
  .addMarker('learning')        // only sees learning events


// ─── Differentiating with markers — same detector, different scope ───────────
//
// This is the main use-case. Same type, same config, different marker = different signal.

const outdoorStreak = new DetectorBuilder('outdoor-streak', 'streak-ongoing')
  .minRepeat(3)
  .notificationType('reminder')
  .addMarker('activities')      // only sees activity events

// learningStreak and outdoorStreak run the same logic on different data.


// ─── Building on top of another — ongoing + break pair ───────────────────────
//
// streak-ongoing fires when the routine is still active (upcoming reminder)
// streak-break   fires when the routine has been broken (missed warning)
//
// Same marker, opposite triggers — two detectors watching the same events.

const learningOngoing = new DetectorBuilder('learning-streak', 'streak-ongoing')
  .minRepeat(3)
  .notificationType('reminder')
  .addMarker('learning')

const learningBreak = new DetectorBuilder('learning-break', 'streak-break')
  .minRepeat(3)
  .notificationType('warning')  // break = warning, not reminder
  .addMarker('learning')        // same marker as above


// ─── All types, quick reference ──────────────────────────────────────────────

// streak-ongoing / streak-break
new DetectorBuilder('med-routine', 'streak-ongoing')
  .minRepeat(5)
  .notificationType('reminder')
  .addMarker('category:health and subcategory:medication')

// checklist — fires when expected items are MISSING today
new DetectorBuilder('meal-completion', 'checklist')
  .expected(['breakfast', 'lunch', 'snack'])
  .todayOnly()
  .notificationType('nudge')
  .addMarker('meals')

// milestone — fires when ALL expected items are PRESENT today
new DetectorBuilder('full-day-complete', 'milestone')
  .expected(['outdoor', 'learning', 'creative'])
  .todayOnly()
  .notificationType('achievement')
  .addMarker('activities')

// threshold — fires when a numeric value crosses a target
new DetectorBuilder('low-protein', 'threshold')
  .extract({ path: 'meta.protein' })  // reads event.meta.protein
  .operator('lt')
  .value(15)
  .aggregate('sum')                   // sum | avg | count | min | max
  .todayOnly()
  .notificationType('warning')
  .addMarker('meals')

// item-analysis — look up item properties, fire if totals miss targets
new DetectorBuilder('food-nutrition', 'item-analysis')
  .extract({ path: 'meta.foodsServed' })        // pulls food names from events
  .lookup({ map: {
    apple:  { protein: 0.3, calcium: 6  },
    eggs:   { protein: 6.0, calcium: 25 },
    milk:   { protein: 3.4, calcium: 125 },
  }})
  .targets({ protein: 15, calcium: 200 })       // fires if either target is not met
  .todayOnly()
  .notificationType('nudge')
  .addMarker('meals')
