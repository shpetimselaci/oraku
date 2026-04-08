import fs from 'fs'
import path from 'path'

// ─── types ────────────────────────────────────────────────────────────────────

interface RawEvent {
  externalRef: string  // set to userId so all events for a user stitch into one entry
  category: string
  subcategory: string
  log: string
  name?: string
  items?: string[]
  meta: {
    username: string
    userId: string
    organizationId: string
    organizationName: string
  }
  createdAt: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function daysAgo(n: number, hourOffset = 9): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hourOffset, 0, 0, 0)
  return d
}

function jitterHours(date: Date, range = 3): Date {
  const ms = (Math.random() * 2 - 1) * range * 3_600_000
  return new Date(date.getTime() + ms)
}

let _seq = 0
function seq(prefix: string): string { return `${prefix}-${++_seq}` }


// ─── institution data ─────────────────────────────────────────────────────────

interface ActivityDef {
  subcategory: string
  activities: string[]
  items?: string[]
}

interface InstitutionDef {
  orgNames: string[]
  usernames: string[]
  categories: Record<string, ActivityDef[]>
}

const INSTITUTIONS: Record<string, InstitutionDef> = {
  daycare: {
    orgNames: ['Sunshine Academy', 'Little Stars Daycare', 'Rainbow Learning Center'],
    usernames: ['teacher_amy', 'ms_johnson', 'mr_thomas', 'ms_garcia'],
    categories: {
      curriculum: [
        { subcategory: 'activity_logged', activities: ['Morning Story Reading', 'Outdoor Free Play', 'Alphabet Letters Practice', 'Counting and Numbers', 'Arts and Crafts', 'Science Experiment', 'Music and Movement', 'Sensory Play'] },
        { subcategory: 'circle_time', activities: ['Morning Circle Time', 'Calendar Activity', 'Show and Tell', 'Weather Discussion'] }
      ],
      nutrition: [
        { subcategory: 'morning', activities: ['Breakfast served: oatmeal and fruit', 'Breakfast served: eggs and toast', 'Morning snack: apple slices'], items: ['breakfast', 'morning snack'] },
        { subcategory: 'afternoon', activities: ['Lunch served: grilled chicken and rice', 'Lunch served: pasta and veggies', 'Afternoon snack: crackers and cheese'], items: ['lunch', 'afternoon snack'] }
      ],
      engagement: [
        { subcategory: 'creative_activity', activities: ['Telescope Exploration', 'Bug Hunt', 'Water Table Play', 'Sand Table Activity', 'Puppet Show'] },
        { subcategory: 'group_play', activities: ['Block Building', 'Dramatic Play', 'Board Games', 'Puzzle Time'] }
      ],
      routine: [
        { subcategory: 'attendance', activities: ['Morning Attendance', 'Afternoon Attendance'] },
        { subcategory: 'cleanup', activities: ['Classroom Cleanup Time', 'Toy Cleanup', 'Table Wipe Down'] },
        { subcategory: 'nap', activities: ['Nap Time Started', 'Rest Time', 'Quiet Time'] }
      ],
      health: [
        { subcategory: 'check', activities: ['Temperature Check', 'Diaper Change', 'Hand Washing Reminder'], items: ['temperature check', 'diaper log'] },
        { subcategory: 'incident', activities: ['Minor Bump Reported', 'Allergy Check Completed', 'Medication Administered'] }
      ]
    }
  },

  gym: {
    orgNames: ['IronForge Fitness', 'Peak Performance Gym', 'Vitality Club'],
    usernames: ['coach_mike', 'trainer_sara', 'staff_alex'],
    categories: {
      workout: [
        { subcategory: 'strength', activities: ['Bench Press Session', 'Squat Program', 'Deadlift Training', 'Upper Body Workout', 'Leg Day'] },
        { subcategory: 'cardio', activities: ['Treadmill Run', 'Cycling Session', 'Rowing Machine', 'Jump Rope Circuit', 'Stair Climber'] },
        { subcategory: 'flexibility', activities: ['Yoga Class', 'Stretching Routine', 'Foam Rolling Session', 'Pilates Class'], items: ['warm-up', 'main set', 'cool-down'] }
      ],
      nutrition: [
        { subcategory: 'log', activities: ['Pre-Workout Meal Logged', 'Post-Workout Meal Logged', 'Protein Shake Consumed', 'Water Intake Logged'], items: ['pre-workout meal', 'post-workout meal', 'hydration target'] }
      ],
      assessment: [
        { subcategory: 'body', activities: ['Body Weight Check', 'Body Fat Measurement', 'Progress Photos Taken'] },
        { subcategory: 'performance', activities: ['Max Rep Test', 'VO2 Max Test', 'Fitness Assessment'] }
      ],
      recovery: [
        { subcategory: 'rest', activities: ['Rest Day Logged', 'Ice Bath Session', 'Massage Therapy'] },
        { subcategory: 'sleep', activities: ['Sleep Log: 8 hours', 'Sleep Log: 6 hours', 'Sleep Log: 7 hours'] }
      ]
    }
  },

  school: {
    orgNames: ['Maplewood Elementary', 'Riverside Middle School', 'Cedar High School'],
    usernames: ['teacher_brown', 'ms_davis', 'mr_wilson', 'ms_taylor'],
    categories: {
      academics: [
        { subcategory: 'math', activities: ['Arithmetic Worksheet', 'Fractions Lesson', 'Geometry Activity', 'Mental Math Practice'], items: ['homework', 'participation', 'quiz'] },
        { subcategory: 'reading', activities: ['Reading Circle', 'Independent Reading', 'Phonics Practice', 'Comprehension Quiz'] },
        { subcategory: 'science', activities: ['Science Experiment', 'Lab Report Written', 'Nature Walk Observation', 'Plant Growth Check'] },
        { subcategory: 'art', activities: ['Painting Session', 'Clay Modeling', 'Drawing Workshop'] }
      ],
      behavior: [
        { subcategory: 'positive', activities: ['Star of the Day', 'Helped a Classmate', 'Good Listener Award', 'Leadership Shown'] },
        { subcategory: 'incident', activities: ['Disruptive Behavior Noted', 'Conflict Resolved', 'Parent Notified'] }
      ],
      health: [
        { subcategory: 'meal', activities: ['Breakfast Served', 'Lunch Served', 'Afternoon Snack'], items: ['breakfast', 'lunch', 'snack'] },
        { subcategory: 'nurse', activities: ['Nurse Visit', 'Allergy Check', 'Medication Administered'] }
      ],
      routine: [
        { subcategory: 'attendance', activities: ['Morning Check-In', 'Absent Recorded', 'Late Arrival Noted'] },
        { subcategory: 'homework', activities: ['Homework Collected', 'Assignment Handed Out', 'Project Deadline Reminder'] }
      ]
    }
  },

  clinic: {
    orgNames: ['Greenfield Medical Center', 'Riverside Health Clinic', 'CareFirst Family Practice'],
    usernames: ['nurse_patel', 'dr_chen', 'staff_kim'],
    categories: {
      checkup: [
        { subcategory: 'vitals', activities: ['Blood Pressure Check', 'Heart Rate Measurement', 'Temperature Reading', 'Weight Measurement', 'Oxygen Level Check'], items: ['blood pressure', 'heart rate', 'weight', 'temperature'] },
        { subcategory: 'general', activities: ['Annual Physical', 'Well-Visit Completed', 'Eye Exam', 'Dental Cleaning'] }
      ],
      treatment: [
        { subcategory: 'therapy', activities: ['Physical Therapy Session', 'Occupational Therapy', 'Speech Therapy Session'] },
        { subcategory: 'procedure', activities: ['Wound Dressing', 'Blood Draw', 'IV Administered', 'Flu Shot Given'] }
      ],
      medication: [
        { subcategory: 'administered', activities: ['Morning Medication Given', 'Evening Medication Given', 'PRN Medication Administered'], items: ['morning dose', 'evening dose'] },
        { subcategory: 'refill', activities: ['Prescription Refill Processed', 'Prescription Issued', 'Medication Review Completed'] }
      ],
      'follow-up': [
        { subcategory: 'scheduled', activities: ['Follow-Up Appointment Scheduled', 'Referral Made', 'Lab Results Reviewed'] },
        { subcategory: 'completed', activities: ['Follow-Up Visit Completed', 'Post-Op Check Done'] }
      ]
    }
  },

  hotel: {
    orgNames: ['Grand Meridian Hotel', 'Harborview Suites', 'The Carlton Lodge'],
    usernames: ['concierge_james', 'front_desk_ana', 'manager_lee'],
    categories: {
      booking: [
        { subcategory: 'reservation', activities: ['Reservation Created', 'Reservation Modified', 'Reservation Cancelled'] },
        { subcategory: 'check-in', activities: ['Standard Check-In', 'Early Check-In', 'VIP Check-In'] },
        { subcategory: 'check-out', activities: ['Standard Check-Out', 'Late Check-Out', 'Express Check-Out'] }
      ],
      service: [
        { subcategory: 'room-service', activities: ['Room Service Order Placed', 'Extra Towels Delivered', 'Wake-Up Call Set'], items: ['welcome amenities', 'room service', 'turndown service'] },
        { subcategory: 'concierge', activities: ['Taxi Requested', 'Restaurant Reservation Made', 'Tour Booked'] },
        { subcategory: 'spa', activities: ['Spa Appointment Booked', 'Massage Session', 'Pool Access Granted'] }
      ],
      housekeeping: [
        { subcategory: 'cleaning', activities: ['Room Cleaned', 'Minibar Restocked', 'Linen Changed'] },
        { subcategory: 'maintenance', activities: ['Maintenance Request Filed', 'AC Repaired', 'Plumbing Checked'] }
      ],
      dining: [
        { subcategory: 'restaurant', activities: ['Breakfast Served', 'Lunch Reservation', 'Dinner Reservation', 'Bar Tab Opened'], items: ['breakfast', 'lunch', 'dinner'] }
      ]
    }
  }
}

// ─── event builders ───────────────────────────────────────────────────────────

function makeEvent(
  ref: string,
  catKey: string,
  def: ActivityDef,
  meta: RawEvent['meta'],
  dateOverride: Date,
  items?: string[]
): RawEvent {
  const activity = pick(def.activities)
  return {
    externalRef: seq(catKey.slice(0, 3)),
    category: catKey,
    subcategory: def.subcategory,
    log: activity,
    name: activity,
    ...(items ? { items } : {}),
    meta,
    createdAt: jitterHours(dateOverride).toISOString()
  }
}

// ─── scenario generators ──────────────────────────────────────────────────────
// These are shaped to trigger specific detectors once stitched by name+category.

// Streak (ongoing): same activity on a regular cadence, last one recent
// → StreakDetector ongoing fires when predicted next is in the future
function addStreakOngoing(events: RawEvent[], catKey: string, def: ActivityDef, meta: RawEvent['meta'], totalDays: number, interval: number): void {
  const activity = pick(def.activities)
  for (let d = totalDays; d >= 0; d -= interval) {
    const date = d === 0 ? daysAgo(1, 9) : jitterHours(daysAgo(d))
    events.push({
      externalRef: seq(catKey.slice(0, 3)),
      category: catKey, subcategory: def.subcategory,
      log: activity, name: activity, meta,
      createdAt: date.toISOString()
    })
  }
}

// Streak (break): regular pattern that stopped well before today
// → StreakDetector break fires when predicted next < now and no later event exists
function addStreakBreak(events: RawEvent[], catKey: string, def: ActivityDef, meta: RawEvent['meta'], totalDays: number): void {
  const activity = pick(def.activities)
  for (let i = 0; i < 4; i++) {
    const d = totalDays - i * 7
    if (d < 14) break
    events.push({
      externalRef: seq(catKey.slice(0, 3)),
      category: catKey, subcategory: def.subcategory,
      log: activity, name: activity, meta,
      createdAt: jitterHours(daysAgo(d)).toISOString()
    })
  }
}

// Dormant category: events only 20-50 days ago, nothing recent
// → AutoAnalyzer variety finding (category not seen in last 7 days)
function addDormant(events: RawEvent[], catKey: string, def: ActivityDef, meta: RawEvent['meta']): void {
  ;[50, 35, 22].forEach(d => {
    events.push({
      externalRef: seq(catKey.slice(0, 3)),
      category: catKey, subcategory: def.subcategory,
      log: pick(def.activities), name: pick(def.activities), meta,
      createdAt: jitterHours(daysAgo(d)).toISOString()
    })
  })
}

// Recent burst: events in the last 3 days
// → AutoAnalyzer summary finding
function addRecent(events: RawEvent[], catKey: string, def: ActivityDef, meta: RawEvent['meta']): void {
  ;[0, 1, 2].forEach(d => {
    events.push({
      externalRef: seq(catKey.slice(0, 3)),
      category: catKey, subcategory: def.subcategory,
      log: pick(def.activities), name: pick(def.activities), meta,
      createdAt: jitterHours(daysAgo(d, 10), 5).toISOString()
    })
  })
}

// Checklist events with items[]: some days complete, some partial
// → ChecklistDetector (if the user sets one up)
function addChecklist(events: RawEvent[], catKey: string, def: ActivityDef, meta: RawEvent['meta'], days: number): void {
  if (!def.items?.length) return
  for (let d = days; d >= 0; d -= 2) {
    const count = Math.max(1, def.items.length - Math.floor(Math.random() * 2))
    const presentItems = def.items.slice(0, count)
    events.push(makeEvent('', catKey, def, meta, daysAgo(d), presentItems))
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const opts: Record<string, string> = {}
for (const a of args) {
  const [k, v] = a.replace(/^--/, '').split('=')
  opts[k] = v ?? 'true'
}

const institutionKey = opts.institution ?? 'daycare'
const numUsers       = parseInt(opts.users  ?? '3',  10)
const days           = parseInt(opts.days   ?? '60', 10)
const outPath        = opts.out ?? 'output/activity_events.json'

const institution = INSTITUTIONS[institutionKey]
if (!institution) {
  console.error(`Unknown institution "${institutionKey}". Options: ${Object.keys(INSTITUTIONS).join(', ')}`)
  process.exit(1)
}

const allEvents: RawEvent[] = []
const categoryKeys = Object.keys(institution.categories)

for (let u = 1; u <= numUsers; u++) {
  const userId   = uuid()
  const username = pick(institution.usernames)
  const orgId    = uuid()
  const orgName  = pick(institution.orgNames)
  const meta     = { username, userId, organizationId: orgId, organizationName: orgName }

  // Rotate category assignment per user for variety
  const streakOngoingCat  = categoryKeys[u % categoryKeys.length]
  const streakBreakCat    = categoryKeys[(u + 1) % categoryKeys.length]
  const dormantCat        = categoryKeys[(u + 2) % categoryKeys.length]
  const recentCat         = categoryKeys[(u + 3) % categoryKeys.length]
  const checklistCatKey   = categoryKeys.find(k => institution.categories[k].some(d => d.items?.length)) ?? categoryKeys[0]

  const streakOngoingDef  = pick(institution.categories[streakOngoingCat])
  const streakBreakDef    = pick(institution.categories[streakBreakCat])
  const dormantDef        = pick(institution.categories[dormantCat])
  const recentDef         = pick(institution.categories[recentCat])
  const checklistDef      = institution.categories[checklistCatKey].find(d => d.items?.length) ?? pick(institution.categories[checklistCatKey])

  addStreakOngoing(allEvents, streakOngoingCat, streakOngoingDef, meta, days, 7)
  addStreakBreak  (allEvents, streakBreakCat,   streakBreakDef,   meta, days)
  addDormant      (allEvents, dormantCat,        dormantDef,       meta)
  addRecent       (allEvents, recentCat,          recentDef,        meta)
  addChecklist    (allEvents, checklistCatKey,    checklistDef,     meta, 14)
}

allEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true })
fs.writeFileSync(path.resolve(outPath), JSON.stringify(allEvents, null, 2))

console.log(`Generated ${allEvents.length} events for ${numUsers} user(s) [${institution.orgNames[0]} / ${institutionKey}]`)
console.log(`Saved to:  ${path.resolve(outPath)}`)
console.log()
console.log('Next steps:')
console.log('  npm run stitch')
console.log('  npm run detect')
