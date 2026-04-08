function daysAgo(n, timeUTC = '10:00:00.000Z') {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10) + 'T' + timeUTC
}

function today(timeUTC = '08:00:00.000Z') {
  return new Date().toISOString().slice(0, 10) + 'T' + timeUTC
}

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length))
}

function coin(p = 0.5) { return Math.random() < p }

const DAYCARE_NAME = 'Sunshine Daycare'
const ORG_ID       = 'org-sunshine-daycare-001'

const USER_POOL = [
  { child: { name: 'Emma Johnson',     age: 2, group: 'toddler'   }, parent: { id: 'parent-001', name: 'Sarah Johnson'   }, activity: 'learning', subcategory: 'storytime'     },
  { child: { name: 'Liam Smith',       age: 3, group: 'toddler'   }, parent: { id: 'parent-002', name: 'James Smith'     }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Olivia Davis',     age: 4, group: 'preschool' }, parent: { id: 'parent-003', name: 'Rachel Davis'    }, activity: 'learning', subcategory: 'reading'       },
  { child: { name: 'Noah Wilson',      age: 2, group: 'toddler'   }, parent: { id: 'parent-004', name: 'Mike Wilson'     }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Ava Martinez',     age: 3, group: 'preschool' }, parent: { id: 'parent-005', name: 'Lucia Martinez'  }, activity: 'learning', subcategory: 'art'           },
  { child: { name: 'Lucas Brown',      age: 4, group: 'preschool' }, parent: { id: 'parent-006', name: 'David Brown'     }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Mia Taylor',       age: 2, group: 'toddler'   }, parent: { id: 'parent-007', name: 'Emma Taylor'     }, activity: 'learning', subcategory: 'sensory'       },
  { child: { name: 'Ethan Garcia',     age: 3, group: 'preschool' }, parent: { id: 'parent-008', name: 'Carlos Garcia'   }, activity: 'learning', subcategory: 'numbers'       },
  { child: { name: 'Sofia Rodriguez',  age: 4, group: 'preschool' }, parent: { id: 'parent-009', name: 'Ana Rodriguez'   }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Zoe Chen',         age: 2, group: 'toddler'   }, parent: { id: 'parent-010', name: 'Wei Chen'        }, activity: 'learning', subcategory: 'storytime'     },
  { child: { name: 'Mason Lee',        age: 4, group: 'preschool' }, parent: { id: 'parent-011', name: 'Kate Lee'        }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Aria Patel',       age: 3, group: 'preschool' }, parent: { id: 'parent-012', name: 'Priya Patel'     }, activity: 'learning', subcategory: 'music'         },
  { child: { name: 'Jackson Thompson', age: 5, group: 'preschool' }, parent: { id: 'parent-013', name: 'Laura Thompson'  }, activity: 'activities', subcategory: 'creative'    },
  { child: { name: 'Luna Nguyen',      age: 3, group: 'toddler'   }, parent: { id: 'parent-014', name: 'Hana Nguyen'     }, activity: 'learning', subcategory: 'storytime'     },
  { child: { name: 'Aiden Kim',        age: 4, group: 'preschool' }, parent: { id: 'parent-015', name: 'Ji-yeon Kim'     }, activity: 'learning', subcategory: 'reading'       },
  { child: { name: 'Chloe Anderson',   age: 2, group: 'toddler'   }, parent: { id: 'parent-016', name: 'Mark Anderson'   }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Elijah Walker',    age: 5, group: 'preschool' }, parent: { id: 'parent-017', name: 'Diane Walker'    }, activity: 'learning', subcategory: 'numbers'       },
  { child: { name: 'Layla Harris',     age: 3, group: 'preschool' }, parent: { id: 'parent-018', name: 'Tom Harris'      }, activity: 'activities', subcategory: 'creative'    },
  { child: { name: 'Oliver Clark',     age: 4, group: 'preschool' }, parent: { id: 'parent-019', name: 'Nina Clark'      }, activity: 'learning', subcategory: 'art'           },
  { child: { name: 'Penelope Lewis',   age: 2, group: 'toddler'   }, parent: { id: 'parent-020', name: 'Greg Lewis'      }, activity: 'learning', subcategory: 'sensory'       },
  { child: { name: 'Sebastian Hall',   age: 5, group: 'preschool' }, parent: { id: 'parent-021', name: 'Carla Hall'      }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Violet Young',     age: 3, group: 'toddler'   }, parent: { id: 'parent-022', name: 'Felix Young'     }, activity: 'learning', subcategory: 'music'         },
  { child: { name: 'Henry Allen',      age: 4, group: 'preschool' }, parent: { id: 'parent-023', name: 'Rosa Allen'      }, activity: 'activities', subcategory: 'creative'    },
  { child: { name: 'Stella Scott',     age: 2, group: 'toddler'   }, parent: { id: 'parent-024', name: 'Aaron Scott'     }, activity: 'learning', subcategory: 'storytime'     },
  { child: { name: 'Carter King',      age: 5, group: 'preschool' }, parent: { id: 'parent-025', name: 'Megan King'      }, activity: 'learning', subcategory: 'reading'       },
  { child: { name: 'Zoey Wright',      age: 3, group: 'preschool' }, parent: { id: 'parent-026', name: 'Dan Wright'      }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Dylan Lopez',      age: 4, group: 'preschool' }, parent: { id: 'parent-027', name: 'Isabel Lopez'    }, activity: 'learning', subcategory: 'numbers'       },
  { child: { name: 'Nora Hill',        age: 2, group: 'toddler'   }, parent: { id: 'parent-028', name: 'Chris Hill'      }, activity: 'learning', subcategory: 'sensory'       },
  { child: { name: 'Wyatt Green',      age: 5, group: 'preschool' }, parent: { id: 'parent-029', name: 'Sandra Green'    }, activity: 'activities', subcategory: 'creative'    },
  { child: { name: 'Hazel Baker',      age: 3, group: 'toddler'   }, parent: { id: 'parent-030', name: 'Paul Baker'      }, activity: 'learning', subcategory: 'art'           },
  { child: { name: 'Leo Adams',        age: 4, group: 'preschool' }, parent: { id: 'parent-031', name: 'Tina Adams'      }, activity: 'activities', subcategory: 'outdoor'     },
  { child: { name: 'Riley Nelson',     age: 2, group: 'toddler'   }, parent: { id: 'parent-032', name: 'Ben Nelson'      }, activity: 'learning', subcategory: 'storytime'     },
  { child: { name: 'Scarlett Carter',  age: 5, group: 'preschool' }, parent: { id: 'parent-033', name: 'Amy Carter'      }, activity: 'learning', subcategory: 'music'         },
  { child: { name: 'Julian Mitchell',  age: 3, group: 'preschool' }, parent: { id: 'parent-034', name: 'Luis Mitchell'   }, activity: 'activities', subcategory: 'creative'    },
  { child: { name: 'Aurora Perez',     age: 4, group: 'preschool' }, parent: { id: 'parent-035', name: 'Elena Perez'     }, activity: 'learning', subcategory: 'reading'       },
]

const NUTRITION_MAP = {
  apple:    { protein: 0.3,  vitamin_c: 8.0,  calcium: 6   },
  banana:   { protein: 1.1,  vitamin_c: 8.7,  calcium: 5   },
  milk:     { protein: 3.4,  vitamin_c: 0.0,  calcium: 125 },
  eggs:     { protein: 6.0,  vitamin_c: 0.0,  calcium: 25  },
  carrots:  { protein: 0.6,  vitamin_c: 5.9,  calcium: 20  },
  broccoli: { protein: 2.8,  vitamin_c: 89.2, calcium: 47  },
  yogurt:   { protein: 5.7,  vitamin_c: 0.5,  calcium: 183 },
  chicken:  { protein: 27.0, vitamin_c: 0.0,  calcium: 15  },
  cheese:   { protein: 7.0,  vitamin_c: 0.0,  calcium: 200 },
  orange:   { protein: 0.9,  vitamin_c: 53.2, calcium: 40  }
}

const NUTRITION_TARGETS = { protein: 15, calcium: 200, vitamin_c: 15 }

const BREAKFAST_POOL = ['milk', 'eggs', 'banana', 'yogurt', 'apple']
const LUNCH_POOL     = ['chicken', 'broccoli', 'milk', 'carrots', 'cheese', 'eggs']
const SNACK_POOL     = ['apple', 'cheese', 'orange', 'banana', 'carrots', 'yogurt']

const MEAL_STATUSES    = ['full', 'partial', 'none']
const ACTIVITY_LEVELS  = ['full', 'partial', 'none']

const DETECTORS = [
  { name: 'learning-streak',   type: 'streak-ongoing', marker: 'learning',   minRepeat: 3, notificationType: 'reminder' },
  { name: 'learning-break',    type: 'streak-break',   marker: 'learning',   minRepeat: 3, notificationType: 'warning'  },
  { name: 'outdoor-streak',    type: 'streak-ongoing', marker: 'activities', minRepeat: 3, notificationType: 'reminder' },
  { name: 'outdoor-break',     type: 'streak-break',   marker: 'activities', minRepeat: 3, notificationType: 'warning'  },
  { name: 'meal-completion',   type: 'checklist',      marker: 'meals',      expected: ['breakfast', 'lunch', 'snack'],          todayOnly: true, notificationType: 'nudge'   },
  { name: 'food-nutrition',    type: 'item-analysis',  marker: 'meals',      extract: { path: 'meta.foodsServed' }, lookup: NUTRITION_MAP, targets: NUTRITION_TARGETS, todayOnly: true, notificationType: 'nudge' },
  { name: 'daily-health',      type: 'checklist',      marker: 'health',     expected: ['medication', 'temperature_check'],       todayOnly: true, notificationType: 'warning'  },
  { name: 'activity-variety',  type: 'checklist',      marker: 'activities', expected: ['outdoor', 'learning', 'creative'],       todayOnly: true, notificationType: 'nudge'   },
  { name: 'full-day-complete', type: 'milestone',      marker: 'activities', expected: ['outdoor', 'learning', 'creative'],       todayOnly: true, notificationType: 'achievement' },
]

const LOG_POOLS = {
  storytime:  (name) => pick([
    `${name} listened to a picture book about farm animals`,
    `${name} heard a story about a brave little bear`,
    `${name} joined circle time for a reading of The Very Hungry Caterpillar`,
    `${name} listened to a rhyming book with the group`,
    `${name} sat in for storytime — today's book was about the ocean`,
  ], 1)[0],
  reading:    (name) => pick([
    `${name} practiced reading simple words with flashcards`,
    `${name} read a short book independently`,
    `${name} worked through a phonics activity`,
    `${name} matched letters during reading group`,
    `${name} practised sight words with a teacher`,
  ], 1)[0],
  art:        (name) => pick([
    `${name} painted a butterfly with watercolours`,
    `${name} drew a self-portrait in crayon`,
    `${name} made a handprint collage`,
    `${name} cut and glued shapes to make a rocket`,
    `${name} finger-painted a rainbow`,
  ], 1)[0],
  music:      (name) => pick([
    `${name} played the maracas during music time`,
    `${name} sang along to nursery rhymes with the group`,
    `${name} clapped rhythms in the music circle`,
    `${name} danced to a drumbeat in the hall`,
    `${name} learned a new action song today`,
  ], 1)[0],
  numbers:    (name) => pick([
    `${name} counted blocks up to ten`,
    `${name} matched number cards during maths play`,
    `${name} sorted shapes by colour and counted each group`,
    `${name} practised writing numbers 1 to 5`,
    `${name} played a counting game with a teacher`,
  ], 1)[0],
  sensory:    (name) => pick([
    `${name} explored the sand and water table`,
    `${name} played with kinetic sand for a sensory session`,
    `${name} sorted coloured beads by texture`,
    `${name} used the playdough station — made a snail`,
    `${name} did a messy play session with foam and trays`,
  ], 1)[0],
  outdoor:    (name) => pick([
    `${name} ran around the garden during free play`,
    `${name} climbed on the outdoor frame`,
    `${name} played a chasing game with friends outside`,
    `${name} had a nature walk around the playground`,
    `${name} kicked a ball around in the yard`,
    `${name} blew bubbles in the garden`,
  ], 1)[0],
  creative:   (name) => pick([
    `${name} built a castle from cardboard boxes`,
    `${name} did imaginative play in the home corner`,
    `${name} made a puppet from a sock`,
    `${name} joined a drama activity — played a pirate`,
    `${name} created a collage from magazine cut-outs`,
  ], 1)[0],
}

function streakLog(user) {
  const pool = LOG_POOLS[user.subcategory]
  return pool ? pool(user.child.name) : `${user.child.name} completed a ${user.subcategory.replace(/_/g, ' ')} session`
}

function generateEvents() {
  const pickedCount = 8 + Math.floor(Math.random() * 5) // 8–12 users per run
  const users = pick(USER_POOL, pickedCount)
  const events = []

  for (const user of users) {
    const ref         = user.parent.id
    const baseMeta    = {
      username:         user.parent.name,
      subject:          user.child.name,
      organizationId:   ORG_ID,
      organizationName: DAYCARE_NAME,
      childAge:         user.child.age,
      group:            user.child.group
    }

    const streakDays   = 4 + Math.floor(Math.random() * 17) // 4–20 days
    const breakDays    = 4 + Math.floor(Math.random() * 11) // 4–14 days ago (last event before gap)
    const streakStatus = coin(0.5) ? 'active' : 'broken'
    const mealsStatus  = coin(0.6) ? 'full' : 'partial'
    const withHealth   = coin(0.4)
    const actLevel     = ACTIVITY_LEVELS[Math.floor(Math.random() * 3)]

    // ── learning / activity streak ───────────────────────────────────────────
    if (streakStatus === 'active') {
      for (let i = streakDays; i >= 1; i--) {
        events.push({ externalRef: ref, category: user.activity, subcategory: user.subcategory, log: streakLog(user), createdAt: daysAgo(i), meta: baseMeta })
      }
      events.push({ externalRef: ref, category: user.activity, subcategory: user.subcategory, log: streakLog(user), createdAt: today('10:00:00.000Z'), meta: baseMeta })
    } else {
      for (let i = breakDays + 6; i >= breakDays; i--) {
        events.push({ externalRef: ref, category: user.activity, subcategory: user.subcategory, log: streakLog(user), createdAt: daysAgo(i), meta: baseMeta })
      }
    }

    // ── meals ────────────────────────────────────────────────────────────────
    if (mealsStatus === 'full') {
      events.push({ externalRef: ref, category: 'meals', subcategory: 'breakfast', log: `${user.child.name} had breakfast`, createdAt: today('08:00:00.000Z'), meta: { ...baseMeta, foodsServed: pick(BREAKFAST_POOL, 3) } })
      events.push({ externalRef: ref, category: 'meals', subcategory: 'lunch',     log: `${user.child.name} had lunch`,     createdAt: today('12:00:00.000Z'), meta: { ...baseMeta, foodsServed: pick(LUNCH_POOL, 3)     } })
      events.push({ externalRef: ref, category: 'meals', subcategory: 'snack',     log: `${user.child.name} had a snack`,   createdAt: today('15:00:00.000Z'), meta: { ...baseMeta, foodsServed: pick(SNACK_POOL, 2)     } })
    } else if (mealsStatus === 'partial') {
      events.push({ externalRef: ref, category: 'meals', subcategory: 'breakfast', log: `${user.child.name} had breakfast`, createdAt: today('08:30:00.000Z'), meta: { ...baseMeta, foodsServed: pick(BREAKFAST_POOL, 2) } })
    }

    // ── health ───────────────────────────────────────────────────────────────
    if (withHealth) {
      events.push({ externalRef: ref, category: 'health', subcategory: 'medication',        log: `${user.child.name} received medication`,     createdAt: today('09:00:00.000Z'), meta: baseMeta })
      if (coin()) {
        events.push({ externalRef: ref, category: 'health', subcategory: 'temperature_check', log: `${user.child.name}'s temperature was checked`, createdAt: today('09:05:00.000Z'), meta: baseMeta })
      }
    }

    // ── activity variety ─────────────────────────────────────────────────────
    if (actLevel === 'full') {
      events.push({ externalRef: ref, category: 'activities', subcategory: 'outdoor',  log: `${user.child.name} played outside`,         createdAt: today('10:00:00.000Z'), meta: baseMeta })
      events.push({ externalRef: ref, category: 'activities', subcategory: 'learning', log: `${user.child.name} had a learning session`,  createdAt: today('11:00:00.000Z'), meta: baseMeta })
      events.push({ externalRef: ref, category: 'activities', subcategory: 'creative', log: `${user.child.name} did creative play`,       createdAt: today('14:00:00.000Z'), meta: baseMeta })
    } else if (actLevel === 'partial') {
      events.push({ externalRef: ref, category: 'activities', subcategory: 'outdoor',  log: `${user.child.name} played outside`,         createdAt: today('10:00:00.000Z'), meta: baseMeta })
    }
  }

  return events
}

module.exports = { generateEvents, DETECTORS }
