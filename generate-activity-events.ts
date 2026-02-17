import { faker } from "@faker-js/faker";
import * as fs from "fs";
import * as path from "path";

// ============================================
// DAYCARE-SPECIFIC DATA
// ============================================
const childFirstNames = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Sophia", "Elijah",
  "Isabella", "Lucas", "Mia", "Mason", "Charlotte", "Ethan", "Amelia",
  "Aiden", "Harper", "Jackson", "Evelyn", "Sebastian", "Luna", "Mateo",
  "Aria", "Henry", "Ella", "Owen", "Chloe", "Alexander", "Penelope", "James",
];

const classrooms = [
  { name: "Butterflies", ageGroup: "infant", minAge: 0, maxAge: 12 },
  { name: "Caterpillars", ageGroup: "infant", minAge: 0, maxAge: 12 },
  { name: "Ladybugs", ageGroup: "toddler", minAge: 12, maxAge: 24 },
  { name: "Bumblebees", ageGroup: "toddler", minAge: 12, maxAge: 24 },
  { name: "Dragonflies", ageGroup: "preschool", minAge: 24, maxAge: 48 },
  { name: "Fireflies", ageGroup: "preschool", minAge: 24, maxAge: 48 },
  { name: "Dolphins", ageGroup: "prek", minAge: 48, maxAge: 60 },
  { name: "Starfish", ageGroup: "prek", minAge: 48, maxAge: 60 },
];

const teacherNames = [
  "Ms. Johnson", "Ms. Garcia", "Ms. Williams", "Ms. Martinez", "Ms. Brown",
  "Ms. Davis", "Ms. Rodriguez", "Ms. Wilson", "Mr. Anderson", "Mr. Thomas",
  "Ms. Taylor", "Ms. Moore", "Ms. Jackson", "Ms. White", "Ms. Harris",
];

const songs = [
  "Twinkle Twinkle Little Star", "The Wheels on the Bus", "Old MacDonald",
  "Baby Shark", "Itsy Bitsy Spider", "Row Row Row Your Boat", "ABC Song",
  "If You're Happy and You Know It", "Head Shoulders Knees and Toes",
  "Five Little Monkeys", "Baa Baa Black Sheep", "London Bridge",
  "Hickory Dickory Dock", "Mary Had a Little Lamb", "Humpty Dumpty",
  "Ring Around the Rosie", "Pat-a-Cake", "This Little Piggy",
];

const tales = [
  "Goodnight Moon", "The Very Hungry Caterpillar", "Where the Wild Things Are",
  "Brown Bear Brown Bear", "The Cat in the Hat", "Green Eggs and Ham",
  "Corduroy", "Guess How Much I Love You", "The Giving Tree",
  "Chicka Chicka Boom Boom", "If You Give a Mouse a Cookie", "Llama Llama Red Pajama",
  "The Rainbow Fish", "Curious George", "Clifford the Big Red Dog",
  "Pete the Cat", "Dragons Love Tacos", "The Gruffalo",
  "Room on the Broom", "We're Going on a Bear Hunt", "Dear Zoo",
];

const foods = [
  "Apple slices", "Banana", "Crackers", "Cheese cubes", "Yogurt",
  "Pasta", "Chicken nuggets", "Carrots", "Grapes", "Sandwich",
  "Rice", "Broccoli", "Mashed potatoes", "Peas", "Oatmeal",
  "Pancakes", "Scrambled eggs", "Toast", "Fruit salad", "Veggie sticks",
];

const crafts = [
  "Finger painting", "Playdough shapes", "Paper collage", "Leaf rubbing",
  "Hand print art", "Cotton ball clouds", "Pasta necklace", "Paper plate animal",
  "Tissue paper flowers", "Sticker art", "Stamp painting", "Crayon drawing",
  "Watercolor painting", "Glitter glue art", "Paper airplane", "Popsicle stick craft",
];

const physicalActivities = [
  "Running", "Jumping", "Climbing", "Dancing", "Balancing", "Hopping",
  "Skipping", "Throwing ball", "Catching ball", "Kicking ball", "Crawling",
  "Sliding", "Swinging", "Riding tricycle", "Playing tag", "Obstacle course",
];

const socialBehaviors = [
  "Shared toys with friend", "Helped another child", "Played cooperatively",
  "Took turns", "Used kind words", "Gave a hug", "Made a new friend",
  "Resolved conflict peacefully", "Included others in play", "Said please and thank you",
  "Comforted a crying friend", "Followed classroom rules", "Raised hand to speak",
];

const learningActivities = [
  "Counting objects", "Letter recognition", "Color sorting", "Shape matching",
  "Puzzle completion", "Pattern making", "Number tracing", "Letter tracing",
  "Sight word practice", "Phonics exercise", "Sorting by size", "Sequencing",
  "Memory game", "Matching game", "Building with blocks", "Science experiment",
];

const assessmentTypes = [
  "Cognitive Development", "Language Development", "Social-Emotional",
  "Fine Motor Skills", "Gross Motor Skills", "Self-Help Skills",
  "Early Literacy", "Early Math", "Creative Expression", "Physical Development",
];

const milestones = [
  "Said first word", "Took first steps", "Counted to 10", "Wrote their name",
  "Tied shoelaces", "Recognized all letters", "Spelled first word",
  "Used scissors independently", "Drew a person", "Counted to 20",
  "Recognized all colors", "Recognized all shapes", "Wrote all letters",
  "Read first word", "Buttoned shirt independently", "Zipped jacket independently",
  "Used fork and spoon properly", "Poured drink independently",
];

const moods = ["Happy", "Excited", "Calm", "Tired", "Silly", "Curious", "Focused", "Playful"];

// ============================================
// CATEGORY -> SUBCATEGORY MAPPING
// ============================================
const categoryMap: Record<string, string[]> = {
  // What the child did (child-initiated actions)
  child_action: [
    "played_independently",
    "played_with_friends",
    "built_tower",
    "completed_puzzle",
    "drew_picture",
    "made_craft",
    "sang_song",
    "danced",
    "told_story",
    "asked_question",
    "helped_clean_up",
    "dressed_independently",
    "washed_hands",
    "brushed_teeth",
    "used_potty",
    "tried_new_food",
    "showed_curiosity",
    "explored_nature",
    "pretend_play",
    "read_book",
  ],
  // Physical activities
  child_physical: [
    "ran",
    "jumped",
    "climbed",
    "balanced",
    "threw_ball",
    "caught_ball",
    "kicked_ball",
    "rode_tricycle",
    "did_obstacle_course",
    "did_yoga",
    "stretched",
    "played_outside",
    "swung_on_swing",
    "went_down_slide",
    "played_in_sandbox",
  ],
  // Social & emotional
  child_social: [
    "shared_with_friend",
    "helped_classmate",
    "made_new_friend",
    "played_cooperatively",
    "took_turns",
    "used_kind_words",
    "gave_hug",
    "expressed_feelings",
    "resolved_conflict",
    "showed_empathy",
    "comforted_friend",
    "followed_rules",
    "waited_patiently",
    "celebrated_friend",
  ],
  // Learning achievements
  child_learning: [
    "recognized_letter",
    "recognized_number",
    "recognized_color",
    "recognized_shape",
    "counted_objects",
    "sorted_objects",
    "completed_pattern",
    "matched_pairs",
    "traced_letter",
    "traced_number",
    "spelled_word",
    "read_word",
    "answered_question",
    "followed_directions",
    "remembered_fact",
  ],
  // Teacher gave/did something
  teacher_action: [
    "gave_food",
    "gave_snack",
    "gave_bottle",
    "gave_water",
    "read_story",
    "sang_song",
    "led_activity",
    "taught_lesson",
    "helped_with_craft",
    "comforted_child",
    "gave_praise",
    "gave_encouragement",
    "changed_diaper",
    "helped_potty",
    "applied_sunscreen",
    "gave_medication",
    "took_temperature",
    "helped_nap",
    "supervised_play",
  ],
  // Teacher assessments
  assessment: [
    "teacher_created_assessment",
    "teacher_assigned_assessment",
    "child_started_assessment",
    "child_completed_assessment",
    "teacher_graded_assessment",
    "teacher_added_observation",
    "teacher_recorded_milestone",
    "teacher_noted_progress",
    "teacher_flagged_concern",
    "parent_viewed_assessment",
    "parent_acknowledged_assessment",
    "assessment_shared_with_parent",
  ],
  // Parent actions at home
  parent_home: [
    "read_bedtime_story",
    "sang_song",
    "played_game",
    "did_craft",
    "cooked_together",
    "did_homework",
    "practiced_letters",
    "practiced_numbers",
    "went_to_park",
    "had_playdate",
    "watched_educational_show",
    "did_puzzle",
    "played_outside",
    "did_bath_time",
    "brushed_teeth",
    "got_ready_for_bed",
    "said_goodnight",
    "morning_routine",
    "family_dinner",
  ],
  // Parent-teacher communication
  parent_teacher: [
    "parent_sent_message",
    "teacher_sent_message",
    "parent_viewed_daily_report",
    "parent_viewed_photo",
    "parent_viewed_video",
    "parent_liked_update",
    "parent_commented",
    "parent_requested_conference",
    "conference_scheduled",
    "conference_completed",
    "parent_signed_form",
    "parent_updated_info",
  ],
  // Daily routines at daycare
  daily_routine: [
    "arrived",
    "departed",
    "ate_breakfast",
    "ate_lunch",
    "ate_snack",
    "drank_bottle",
    "nap_started",
    "nap_ended",
    "diaper_changed",
    "used_potty",
    "went_outside",
    "came_inside",
    "washed_hands",
    "circle_time",
    "free_play",
    "structured_activity",
  ],
  // Health observations
  health: [
    "temperature_normal",
    "temperature_elevated",
    "seemed_tired",
    "seemed_unwell",
    "had_good_appetite",
    "had_low_appetite",
    "coughed",
    "sneezed",
    "had_runny_nose",
    "had_bowel_movement",
    "slept_well",
    "slept_poorly",
    "mood_happy",
    "mood_fussy",
    "injury_minor",
    "first_aid_applied",
  ],
};

const categories = Object.keys(categoryMap);

// ============================================
// LOG CONTEXT INTERFACE
// ============================================
interface LogContext {
  childName: string;
  childId: string;
  classroom: string;
  ageGroup: string;
  teacherName: string;
  parentName: string;
  song: string;
  tale: string;
  food: string;
  craft: string;
  physicalActivity: string;
  socialBehavior: string;
  learningActivity: string;
  assessmentType: string;
  assessmentScore: string;
  milestone: string;
  mood: string;
  friendName: string;
  letter: string;
  number: string;
  color: string;
  shape: string;
  duration: string;
  napDuration: string;
  temperature: string;
  bottleOz: string;
  diaperType: string;
  mealConsumption: string;
  time: string;
}

// ============================================
// LOG MESSAGE TEMPLATES
// ============================================
const logTemplates: Record<string, (subcategory: string, ctx: LogContext) => string> = {
  child_action: (sub, ctx) => {
    const messages: Record<string, string> = {
      played_independently: `${ctx.childName} played independently for ${ctx.duration}`,
      played_with_friends: `${ctx.childName} played with ${ctx.friendName} and other friends`,
      built_tower: `${ctx.childName} built a tall tower with blocks`,
      completed_puzzle: `${ctx.childName} completed a puzzle independently`,
      drew_picture: `${ctx.childName} drew a beautiful picture`,
      made_craft: `${ctx.childName} made a ${ctx.craft}`,
      sang_song: `${ctx.childName} sang "${ctx.song}"`,
      danced: `${ctx.childName} danced happily during music time`,
      told_story: `${ctx.childName} told a creative story to the class`,
      asked_question: `${ctx.childName} asked a thoughtful question`,
      helped_clean_up: `${ctx.childName} helped clean up the classroom`,
      dressed_independently: `${ctx.childName} got dressed independently`,
      washed_hands: `${ctx.childName} washed hands without prompting`,
      brushed_teeth: `${ctx.childName} brushed teeth after lunch`,
      used_potty: `${ctx.childName} used the potty independently`,
      tried_new_food: `${ctx.childName} tried ${ctx.food} for the first time`,
      showed_curiosity: `${ctx.childName} showed curiosity about ${ctx.learningActivity}`,
      explored_nature: `${ctx.childName} explored nature during outdoor time`,
      pretend_play: `${ctx.childName} engaged in imaginative pretend play`,
      read_book: `${ctx.childName} looked through "${ctx.tale}" independently`,
    };
    return messages[sub] || `${ctx.childName} did an activity`;
  },
  child_physical: (sub, ctx) => {
    const messages: Record<string, string> = {
      ran: `${ctx.childName} ran around the playground`,
      jumped: `${ctx.childName} practiced jumping`,
      climbed: `${ctx.childName} climbed on the play structure`,
      balanced: `${ctx.childName} practiced balancing on the beam`,
      threw_ball: `${ctx.childName} practiced throwing a ball`,
      caught_ball: `${ctx.childName} caught a ball`,
      kicked_ball: `${ctx.childName} kicked a ball during soccer play`,
      rode_tricycle: `${ctx.childName} rode the tricycle`,
      did_obstacle_course: `${ctx.childName} completed the obstacle course`,
      did_yoga: `${ctx.childName} participated in kids yoga`,
      stretched: `${ctx.childName} did stretching exercises`,
      played_outside: `${ctx.childName} played outside for ${ctx.duration}`,
      swung_on_swing: `${ctx.childName} enjoyed the swings`,
      went_down_slide: `${ctx.childName} went down the slide`,
      played_in_sandbox: `${ctx.childName} played in the sandbox`,
    };
    return messages[sub] || `${ctx.childName} did physical activity`;
  },
  child_social: (sub, ctx) => {
    const messages: Record<string, string> = {
      shared_with_friend: `${ctx.childName} shared toys with ${ctx.friendName}`,
      helped_classmate: `${ctx.childName} helped ${ctx.friendName} with a task`,
      made_new_friend: `${ctx.childName} made friends with ${ctx.friendName}`,
      played_cooperatively: `${ctx.childName} played cooperatively with classmates`,
      took_turns: `${ctx.childName} took turns nicely during game time`,
      used_kind_words: `${ctx.childName} used kind words with friends`,
      gave_hug: `${ctx.childName} gave a hug to ${ctx.friendName}`,
      expressed_feelings: `${ctx.childName} expressed feelings appropriately`,
      resolved_conflict: `${ctx.childName} resolved a conflict peacefully`,
      showed_empathy: `${ctx.childName} showed empathy towards ${ctx.friendName}`,
      comforted_friend: `${ctx.childName} comforted ${ctx.friendName} who was upset`,
      followed_rules: `${ctx.childName} followed classroom rules well today`,
      waited_patiently: `${ctx.childName} waited patiently for their turn`,
      celebrated_friend: `${ctx.childName} celebrated ${ctx.friendName}'s achievement`,
    };
    return messages[sub] || `${ctx.childName} had social interaction`;
  },
  child_learning: (sub, ctx) => {
    const messages: Record<string, string> = {
      recognized_letter: `${ctx.childName} recognized the letter "${ctx.letter}"`,
      recognized_number: `${ctx.childName} recognized the number ${ctx.number}`,
      recognized_color: `${ctx.childName} correctly identified ${ctx.color}`,
      recognized_shape: `${ctx.childName} correctly identified a ${ctx.shape}`,
      counted_objects: `${ctx.childName} counted ${ctx.number} objects correctly`,
      sorted_objects: `${ctx.childName} sorted objects by ${ctx.color}`,
      completed_pattern: `${ctx.childName} completed a pattern sequence`,
      matched_pairs: `${ctx.childName} matched pairs in a memory game`,
      traced_letter: `${ctx.childName} traced the letter "${ctx.letter}"`,
      traced_number: `${ctx.childName} traced the number ${ctx.number}`,
      spelled_word: `${ctx.childName} spelled a word correctly`,
      read_word: `${ctx.childName} read a sight word`,
      answered_question: `${ctx.childName} answered a question correctly`,
      followed_directions: `${ctx.childName} followed multi-step directions`,
      remembered_fact: `${ctx.childName} remembered a fact from yesterday's lesson`,
    };
    return messages[sub] || `${ctx.childName} showed learning progress`;
  },
  teacher_action: (sub, ctx) => {
    const messages: Record<string, string> = {
      gave_food: `${ctx.teacherName} served ${ctx.food} to ${ctx.childName}`,
      gave_snack: `${ctx.teacherName} gave snack to ${ctx.childName}. Ate: ${ctx.mealConsumption}`,
      gave_bottle: `${ctx.teacherName} gave ${ctx.childName} a ${ctx.bottleOz}oz bottle`,
      gave_water: `${ctx.teacherName} gave water to ${ctx.childName}`,
      read_story: `${ctx.teacherName} read "${ctx.tale}" to ${ctx.childName}`,
      sang_song: `${ctx.teacherName} sang "${ctx.song}" with ${ctx.childName}`,
      led_activity: `${ctx.teacherName} led ${ctx.learningActivity} with ${ctx.childName}`,
      taught_lesson: `${ctx.teacherName} taught ${ctx.childName} about ${ctx.learningActivity}`,
      helped_with_craft: `${ctx.teacherName} helped ${ctx.childName} with ${ctx.craft}`,
      comforted_child: `${ctx.teacherName} comforted ${ctx.childName}`,
      gave_praise: `${ctx.teacherName} praised ${ctx.childName} for good behavior`,
      gave_encouragement: `${ctx.teacherName} encouraged ${ctx.childName} during activity`,
      changed_diaper: `${ctx.teacherName} changed ${ctx.childName}'s diaper (${ctx.diaperType})`,
      helped_potty: `${ctx.teacherName} helped ${ctx.childName} with potty`,
      applied_sunscreen: `${ctx.teacherName} applied sunscreen to ${ctx.childName}`,
      gave_medication: `${ctx.teacherName} administered medication to ${ctx.childName}`,
      took_temperature: `${ctx.teacherName} took ${ctx.childName}'s temperature: ${ctx.temperature}`,
      helped_nap: `${ctx.teacherName} helped ${ctx.childName} settle down for nap`,
      supervised_play: `${ctx.teacherName} supervised ${ctx.childName} during ${ctx.physicalActivity}`,
    };
    return messages[sub] || `${ctx.teacherName} helped ${ctx.childName}`;
  },
  assessment: (sub, ctx) => {
    const messages: Record<string, string> = {
      teacher_created_assessment: `${ctx.teacherName} created ${ctx.assessmentType} assessment for ${ctx.childName}`,
      teacher_assigned_assessment: `${ctx.teacherName} assigned ${ctx.assessmentType} assessment to ${ctx.childName}`,
      child_started_assessment: `${ctx.childName} started ${ctx.assessmentType} assessment`,
      child_completed_assessment: `${ctx.childName} completed ${ctx.assessmentType} assessment`,
      teacher_graded_assessment: `${ctx.teacherName} graded ${ctx.childName}'s ${ctx.assessmentType} assessment: ${ctx.assessmentScore}`,
      teacher_added_observation: `${ctx.teacherName} added observation note for ${ctx.childName}`,
      teacher_recorded_milestone: `${ctx.teacherName} recorded milestone for ${ctx.childName}: ${ctx.milestone}`,
      teacher_noted_progress: `${ctx.teacherName} noted progress for ${ctx.childName} in ${ctx.assessmentType}`,
      teacher_flagged_concern: `${ctx.teacherName} flagged developmental concern for ${ctx.childName}`,
      parent_viewed_assessment: `${ctx.parentName} viewed ${ctx.childName}'s ${ctx.assessmentType} assessment`,
      parent_acknowledged_assessment: `${ctx.parentName} acknowledged ${ctx.childName}'s assessment results`,
      assessment_shared_with_parent: `${ctx.assessmentType} assessment shared with ${ctx.parentName}`,
    };
    return messages[sub] || `Assessment activity for ${ctx.childName}`;
  },
  parent_home: (sub, ctx) => {
    const messages: Record<string, string> = {
      read_bedtime_story: `${ctx.parentName} read "${ctx.tale}" to ${ctx.childName} before bed`,
      sang_song: `${ctx.parentName} sang "${ctx.song}" to ${ctx.childName}`,
      played_game: `${ctx.parentName} played a game with ${ctx.childName}`,
      did_craft: `${ctx.parentName} did ${ctx.craft} with ${ctx.childName}`,
      cooked_together: `${ctx.parentName} cooked ${ctx.food} with ${ctx.childName}`,
      did_homework: `${ctx.parentName} helped ${ctx.childName} with learning activities`,
      practiced_letters: `${ctx.parentName} practiced letters with ${ctx.childName}`,
      practiced_numbers: `${ctx.parentName} practiced counting with ${ctx.childName}`,
      went_to_park: `${ctx.parentName} took ${ctx.childName} to the park`,
      had_playdate: `${ctx.childName} had a playdate with ${ctx.friendName}`,
      watched_educational_show: `${ctx.childName} watched an educational show at home`,
      did_puzzle: `${ctx.parentName} did a puzzle with ${ctx.childName}`,
      played_outside: `${ctx.childName} played outside at home`,
      did_bath_time: `${ctx.parentName} gave ${ctx.childName} a bath`,
      brushed_teeth: `${ctx.childName} brushed teeth at home`,
      got_ready_for_bed: `${ctx.childName} got ready for bed`,
      said_goodnight: `${ctx.parentName} said goodnight to ${ctx.childName}`,
      morning_routine: `${ctx.childName} completed morning routine at home`,
      family_dinner: `${ctx.childName} had family dinner`,
    };
    return messages[sub] || `Home activity for ${ctx.childName}`;
  },
  parent_teacher: (sub, ctx) => {
    const messages: Record<string, string> = {
      parent_sent_message: `${ctx.parentName} sent message to ${ctx.teacherName} about ${ctx.childName}`,
      teacher_sent_message: `${ctx.teacherName} sent message to ${ctx.parentName} about ${ctx.childName}`,
      parent_viewed_daily_report: `${ctx.parentName} viewed daily report for ${ctx.childName}`,
      parent_viewed_photo: `${ctx.parentName} viewed photo of ${ctx.childName}`,
      parent_viewed_video: `${ctx.parentName} viewed video of ${ctx.childName}`,
      parent_liked_update: `${ctx.parentName} liked an update about ${ctx.childName}`,
      parent_commented: `${ctx.parentName} commented on ${ctx.childName}'s activity`,
      parent_requested_conference: `${ctx.parentName} requested conference with ${ctx.teacherName}`,
      conference_scheduled: `Conference scheduled between ${ctx.parentName} and ${ctx.teacherName}`,
      conference_completed: `Conference completed for ${ctx.childName}`,
      parent_signed_form: `${ctx.parentName} signed permission form for ${ctx.childName}`,
      parent_updated_info: `${ctx.parentName} updated ${ctx.childName}'s information`,
    };
    return messages[sub] || `Parent-teacher communication for ${ctx.childName}`;
  },
  daily_routine: (sub, ctx) => {
    const messages: Record<string, string> = {
      arrived: `${ctx.childName} arrived at daycare`,
      departed: `${ctx.childName} departed from daycare`,
      ate_breakfast: `${ctx.childName} ate breakfast. Consumption: ${ctx.mealConsumption}`,
      ate_lunch: `${ctx.childName} ate lunch. Consumption: ${ctx.mealConsumption}`,
      ate_snack: `${ctx.childName} had snack. Consumption: ${ctx.mealConsumption}`,
      drank_bottle: `${ctx.childName} drank ${ctx.bottleOz}oz bottle`,
      nap_started: `${ctx.childName} started nap`,
      nap_ended: `${ctx.childName} woke up from nap. Duration: ${ctx.napDuration}`,
      diaper_changed: `${ctx.childName}'s diaper changed (${ctx.diaperType})`,
      used_potty: `${ctx.childName} used the potty`,
      went_outside: `${ctx.childName} went outside for play time`,
      came_inside: `${ctx.childName} came inside from outdoor play`,
      washed_hands: `${ctx.childName} washed hands`,
      circle_time: `${ctx.childName} participated in circle time`,
      free_play: `${ctx.childName} had free play time`,
      structured_activity: `${ctx.childName} participated in ${ctx.learningActivity}`,
    };
    return messages[sub] || `Daily routine for ${ctx.childName}`;
  },
  health: (sub, ctx) => {
    const messages: Record<string, string> = {
      temperature_normal: `${ctx.childName}'s temperature normal: ${ctx.temperature}`,
      temperature_elevated: `⚠️ ${ctx.childName}'s temperature elevated: ${ctx.temperature}`,
      seemed_tired: `${ctx.childName} seemed tired today`,
      seemed_unwell: `⚠️ ${ctx.childName} seemed unwell`,
      had_good_appetite: `${ctx.childName} had a good appetite today`,
      had_low_appetite: `${ctx.childName} had low appetite today`,
      coughed: `${ctx.childName} was coughing`,
      sneezed: `${ctx.childName} was sneezing`,
      had_runny_nose: `${ctx.childName} had a runny nose`,
      had_bowel_movement: `${ctx.childName} had a bowel movement`,
      slept_well: `${ctx.childName} slept well during nap`,
      slept_poorly: `${ctx.childName} had difficulty sleeping during nap`,
      mood_happy: `${ctx.childName} was in a ${ctx.mood} mood today`,
      mood_fussy: `${ctx.childName} was fussy today`,
      injury_minor: `${ctx.childName} had a minor injury (treated on site)`,
      first_aid_applied: `First aid applied to ${ctx.childName}`,
    };
    return messages[sub] || `Health observation for ${ctx.childName}`;
  },
};

// ============================================
// INTERFACES
// ============================================
interface MetaData {
  // Child info
  childId: string;
  childName: string;
  childAge: number;
  classroom: string;
  ageGroup: string;
  // People involved
  teacherId: string;
  teacherName: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  friendId?: string;
  friendName?: string;
  // Activity details
  activityDuration?: string;
  mood?: string;
  // Activity-specific data
  song?: string;
  tale?: string;
  food?: string;
  craft?: string;
  physicalActivity?: string;
  learningActivity?: string;
  // Learning specifics
  letter?: string;
  number?: number;
  color?: string;
  shape?: string;
  // Assessment data
  assessmentId?: string;
  assessmentType?: string;
  assessmentScore?: string;
  milestone?: string;
  observationNote?: string;
  // Health data
  temperature?: string;
  symptom?: string;
  injuryType?: string;
  injuryLocation?: string;
  medicationName?: string;
  medicationDosage?: string;
  // Meal data
  mealType?: string;
  mealConsumption?: string;
  bottleOz?: number;
  // Sleep data
  napDuration?: string;
  sleepQuality?: string;
  // Diaper/potty
  diaperType?: string;
  pottySuccess?: boolean;
  // Media
  photoUrl?: string;
  videoUrl?: string;
  // Session info
  sessionId: string;
  source: "teacher_app" | "parent_app" | "kiosk" | "web" | "automated";
  appVersion: string;
  // Location
  facilityId: string;
  facilityName: string;
  classroomId: string;
  location: "classroom" | "playground" | "cafeteria" | "nap_room" | "home" | "bathroom";
  // Tracking
  requestId: string;
  environment: "production" | "staging" | "development";
}

interface ActivityEvent {
  externalRef: string;
  category: string;
  subcategory: string;
  log: string;
  meta: MetaData;
  createdAt: Date;
}

// ============================================
// GENERATORS
// ============================================
function generateLogContext(): LogContext {
  const classroom = faker.helpers.arrayElement(classrooms);
  const childName = faker.helpers.arrayElement(childFirstNames);
  const friendName = faker.helpers.arrayElement(childFirstNames.filter((n) => n !== childName));

  return {
    childName,
    childId: faker.string.uuid(),
    classroom: classroom.name,
    ageGroup: classroom.ageGroup,
    teacherName: faker.helpers.arrayElement(teacherNames),
    parentName: `${faker.person.firstName()} ${faker.person.lastName()}`,
    song: faker.helpers.arrayElement(songs),
    tale: faker.helpers.arrayElement(tales),
    food: faker.helpers.arrayElement(foods),
    craft: faker.helpers.arrayElement(crafts),
    physicalActivity: faker.helpers.arrayElement(physicalActivities),
    socialBehavior: faker.helpers.arrayElement(socialBehaviors),
    learningActivity: faker.helpers.arrayElement(learningActivities),
    assessmentType: faker.helpers.arrayElement(assessmentTypes),
    assessmentScore: faker.helpers.arrayElement(["Exceeds Expectations", "Meets Expectations", "Developing", "Needs Support"]),
    milestone: faker.helpers.arrayElement(milestones),
    mood: faker.helpers.arrayElement(moods),
    friendName,
    letter: faker.helpers.arrayElement("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
    number: String(faker.number.int({ min: 1, max: 20 })),
    color: faker.helpers.arrayElement(["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown"]),
    shape: faker.helpers.arrayElement(["circle", "square", "triangle", "rectangle", "star", "heart", "oval", "diamond"]),
    duration: `${faker.number.int({ min: 5, max: 45 })} minutes`,
    napDuration: `${faker.number.int({ min: 30, max: 120 })} minutes`,
    temperature: `${faker.number.float({ min: 97.0, max: 100.4, fractionDigits: 1 })}°F`,
    bottleOz: String(faker.number.int({ min: 2, max: 8 })),
    diaperType: faker.helpers.arrayElement(["wet", "dirty", "both", "dry"]),
    mealConsumption: faker.helpers.arrayElement(["all", "most", "some", "little", "none"]),
    time: faker.date.recent().toLocaleTimeString(),
  };
}

function generateMeta(ctx: LogContext, category: string, subcategory: string): MetaData {
  const classroom = classrooms.find((c) => c.name === ctx.classroom) || classrooms[0];

  const sourceByCategory: Record<string, MetaData["source"][]> = {
    child_action: ["teacher_app", "kiosk"],
    child_physical: ["teacher_app"],
    child_social: ["teacher_app"],
    child_learning: ["teacher_app"],
    teacher_action: ["teacher_app", "kiosk"],
    assessment: ["teacher_app", "web", "parent_app"],
    parent_home: ["parent_app"],
    parent_teacher: ["parent_app", "teacher_app", "web"],
    daily_routine: ["teacher_app", "kiosk", "automated"],
    health: ["teacher_app", "kiosk"],
  };

  const locationByCategory: Record<string, MetaData["location"][]> = {
    child_action: ["classroom", "playground"],
    child_physical: ["playground", "classroom"],
    child_social: ["classroom", "playground", "cafeteria"],
    child_learning: ["classroom"],
    teacher_action: ["classroom", "cafeteria", "nap_room", "bathroom"],
    assessment: ["classroom"],
    parent_home: ["home"],
    parent_teacher: ["classroom", "home"],
    daily_routine: ["classroom", "cafeteria", "nap_room", "playground", "bathroom"],
    health: ["classroom", "bathroom", "nap_room"],
  };

  // Base metadata
  const baseMeta: MetaData = {
    childId: ctx.childId,
    childName: ctx.childName,
    childAge: faker.number.int({ min: classroom.minAge, max: classroom.maxAge }),
    classroom: ctx.classroom,
    ageGroup: ctx.ageGroup,
    teacherId: faker.string.uuid(),
    teacherName: ctx.teacherName,
    parentId: faker.string.uuid(),
    parentName: ctx.parentName,
    parentEmail: faker.internet.email({ firstName: ctx.parentName.split(" ")[0] }),
    sessionId: faker.string.alphanumeric(32),
    source: faker.helpers.arrayElement(sourceByCategory[category] || ["teacher_app"]),
    appVersion: faker.system.semver(),
    facilityId: faker.string.uuid(),
    facilityName: faker.helpers.arrayElement([
      "Sunshine Daycare",
      "Little Stars Learning Center",
      "Happy Kids Academy",
      "Bright Futures Childcare",
    ]),
    classroomId: faker.string.uuid(),
    location: faker.helpers.arrayElement(locationByCategory[category] || ["classroom"]),
    requestId: faker.string.uuid(),
    environment: faker.helpers.arrayElement(["production", "staging", "development"]),
  };

  // Add category-specific metadata
  switch (category) {
    case "child_action":
      baseMeta.activityDuration = ctx.duration;
      baseMeta.mood = ctx.mood;
      if (subcategory === "sang_song" || subcategory === "danced") {
        baseMeta.song = ctx.song;
      }
      if (subcategory === "made_craft") {
        baseMeta.craft = ctx.craft;
      }
      if (subcategory === "read_book") {
        baseMeta.tale = ctx.tale;
      }
      if (subcategory === "tried_new_food") {
        baseMeta.food = ctx.food;
      }
      if (subcategory === "showed_curiosity") {
        baseMeta.learningActivity = ctx.learningActivity;
      }
      if (subcategory === "played_with_friends") {
        baseMeta.friendId = faker.string.uuid();
        baseMeta.friendName = ctx.friendName;
      }
      break;

    case "child_physical":
      baseMeta.activityDuration = ctx.duration;
      baseMeta.physicalActivity = ctx.physicalActivity;
      baseMeta.mood = ctx.mood;
      break;

    case "child_social":
      baseMeta.friendId = faker.string.uuid();
      baseMeta.friendName = ctx.friendName;
      baseMeta.mood = ctx.mood;
      if (subcategory === "shared_with_friend") {
        baseMeta.observationNote = faker.helpers.arrayElement([
          "Shared blocks", "Shared crayons", "Shared toy car", "Shared doll", "Shared puzzle pieces"
        ]);
      }
      break;

    case "child_learning":
      baseMeta.learningActivity = ctx.learningActivity;
      if (["recognized_letter", "traced_letter"].includes(subcategory)) {
        baseMeta.letter = ctx.letter;
      }
      if (["recognized_number", "traced_number", "counted_objects"].includes(subcategory)) {
        baseMeta.number = parseInt(ctx.number);
      }
      if (["recognized_color", "sorted_objects"].includes(subcategory)) {
        baseMeta.color = ctx.color;
      }
      if (subcategory === "recognized_shape") {
        baseMeta.shape = ctx.shape;
      }
      break;

    case "teacher_action":
      if (["gave_food", "gave_snack"].includes(subcategory)) {
        baseMeta.food = ctx.food;
        baseMeta.mealConsumption = ctx.mealConsumption;
      }
      if (subcategory === "gave_bottle") {
        baseMeta.bottleOz = parseInt(ctx.bottleOz);
      }
      if (subcategory === "read_story") {
        baseMeta.tale = ctx.tale;
      }
      if (subcategory === "sang_song") {
        baseMeta.song = ctx.song;
      }
      if (["led_activity", "taught_lesson"].includes(subcategory)) {
        baseMeta.learningActivity = ctx.learningActivity;
        baseMeta.activityDuration = ctx.duration;
      }
      if (subcategory === "helped_with_craft") {
        baseMeta.craft = ctx.craft;
      }
      if (subcategory === "changed_diaper") {
        baseMeta.diaperType = ctx.diaperType;
      }
      if (subcategory === "helped_potty") {
        baseMeta.pottySuccess = faker.datatype.boolean();
      }
      if (subcategory === "gave_medication") {
        baseMeta.medicationName = faker.helpers.arrayElement(["Tylenol", "Ibuprofen", "Benadryl", "EpiPen", "Inhaler"]);
        baseMeta.medicationDosage = faker.helpers.arrayElement(["2.5ml", "5ml", "1 tablet", "2 puffs"]);
      }
      if (subcategory === "took_temperature") {
        baseMeta.temperature = ctx.temperature;
      }
      if (subcategory === "supervised_play") {
        baseMeta.physicalActivity = ctx.physicalActivity;
        baseMeta.activityDuration = ctx.duration;
      }
      break;

    case "assessment":
      baseMeta.assessmentId = faker.string.uuid();
      baseMeta.assessmentType = ctx.assessmentType;
      if (["teacher_graded_assessment", "parent_viewed_assessment", "parent_acknowledged_assessment"].includes(subcategory)) {
        baseMeta.assessmentScore = ctx.assessmentScore;
      }
      if (subcategory === "teacher_recorded_milestone") {
        baseMeta.milestone = ctx.milestone;
      }
      if (subcategory === "teacher_added_observation") {
        baseMeta.observationNote = faker.helpers.arrayElement([
          "Showing improvement in fine motor skills",
          "Engaged well with peers today",
          "Demonstrated problem-solving abilities",
          "Needs more practice with letter recognition",
          "Excellent participation in group activities",
          "Working on sharing with others",
          "Making progress with counting",
          "Very creative during art time",
        ]);
      }
      break;

    case "parent_home":
      if (subcategory === "read_bedtime_story") {
        baseMeta.tale = ctx.tale;
      }
      if (subcategory === "sang_song") {
        baseMeta.song = ctx.song;
      }
      if (["played_game", "did_puzzle"].includes(subcategory)) {
        baseMeta.activityDuration = ctx.duration;
      }
      if (subcategory === "did_craft") {
        baseMeta.craft = ctx.craft;
      }
      if (subcategory === "cooked_together") {
        baseMeta.food = ctx.food;
      }
      if (["practiced_letters", "did_homework"].includes(subcategory)) {
        baseMeta.learningActivity = ctx.learningActivity;
        baseMeta.letter = ctx.letter;
      }
      if (subcategory === "practiced_numbers") {
        baseMeta.number = parseInt(ctx.number);
      }
      if (subcategory === "had_playdate") {
        baseMeta.friendId = faker.string.uuid();
        baseMeta.friendName = ctx.friendName;
      }
      if (["went_to_park", "played_outside"].includes(subcategory)) {
        baseMeta.activityDuration = ctx.duration;
        baseMeta.physicalActivity = ctx.physicalActivity;
      }
      break;

    case "parent_teacher":
      if (["parent_viewed_photo", "parent_liked_update"].includes(subcategory)) {
        baseMeta.photoUrl = `https://storage.daycare.app/photos/${faker.string.alphanumeric(16)}.jpg`;
      }
      if (subcategory === "parent_viewed_video") {
        baseMeta.videoUrl = `https://storage.daycare.app/videos/${faker.string.alphanumeric(16)}.mp4`;
      }
      break;

    case "daily_routine":
      if (["ate_breakfast", "ate_lunch", "ate_snack"].includes(subcategory)) {
        baseMeta.mealType = subcategory.replace("ate_", "");
        baseMeta.mealConsumption = ctx.mealConsumption;
        baseMeta.food = ctx.food;
      }
      if (subcategory === "drank_bottle") {
        baseMeta.bottleOz = parseInt(ctx.bottleOz);
      }
      if (subcategory === "nap_ended") {
        baseMeta.napDuration = ctx.napDuration;
        baseMeta.sleepQuality = faker.helpers.arrayElement(["excellent", "good", "fair", "restless"]);
      }
      if (subcategory === "diaper_changed") {
        baseMeta.diaperType = ctx.diaperType;
      }
      if (subcategory === "used_potty") {
        baseMeta.pottySuccess = true;
      }
      if (subcategory === "structured_activity") {
        baseMeta.learningActivity = ctx.learningActivity;
        baseMeta.activityDuration = ctx.duration;
      }
      break;

    case "health":
      baseMeta.mood = ctx.mood;
      if (["temperature_normal", "temperature_elevated"].includes(subcategory)) {
        baseMeta.temperature = ctx.temperature;
      }
      if (["coughed", "sneezed", "had_runny_nose", "seemed_unwell"].includes(subcategory)) {
        baseMeta.symptom = faker.helpers.arrayElement(["cough", "runny nose", "sneezing", "fever", "fatigue", "congestion"]);
      }
      if (subcategory === "injury_minor" || subcategory === "first_aid_applied") {
        baseMeta.injuryType = faker.helpers.arrayElement(["bump", "scrape", "cut", "bruise", "bug bite"]);
        baseMeta.injuryLocation = faker.helpers.arrayElement(["head", "arm", "leg", "knee", "elbow", "hand", "finger"]);
      }
      if (["slept_well", "slept_poorly"].includes(subcategory)) {
        baseMeta.napDuration = ctx.napDuration;
        baseMeta.sleepQuality = subcategory === "slept_well" ? "good" : "poor";
      }
      if (["had_good_appetite", "had_low_appetite"].includes(subcategory)) {
        baseMeta.mealConsumption = subcategory === "had_good_appetite" ? "all" : "little";
      }
      break;
  }

  return baseMeta;
}

function generateActivityEvent(): ActivityEvent {
  const category = faker.helpers.arrayElement(categories);
  const subcategory = faker.helpers.arrayElement(categoryMap[category]);
  const context = generateLogContext();

  return {
    externalRef: faker.string.uuid(),
    category,
    subcategory,
    log: logTemplates[category](subcategory, context),
    meta: generateMeta(context, category, subcategory),
    createdAt: faker.date.recent({ days: 30 }),
  };
}

function generateActivityEvents(count: number): ActivityEvent[] {
  return Array.from({ length: count }, generateActivityEvent);
}

// ============================================
// OUTPUT FORMATTERS
// ============================================
function toJSON(events: ActivityEvent[]): string {
  return JSON.stringify(events, null, 2);
}

function toNDJSON(events: ActivityEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n");
}

// Token-compact format for LLM ingestion
function toLLMCompact(events: ActivityEvent[]): string {
  const catAbbrev: Record<string, string> = {
    child_action: "act",
    child_physical: "phys",
    child_social: "soc",
    child_learning: "learn",
    teacher_action: "teach",
    assessment: "assess",
    parent_home: "home",
    parent_teacher: "comm",
    daily_routine: "daily",
    health: "health",
  };

  const formatMeta = (meta: MetaData): string => {
    const parts: string[] = [];
    if (meta.song) parts.push(`song:"${meta.song}"`);
    if (meta.tale) parts.push(`book:"${meta.tale}"`);
    if (meta.food) parts.push(`food:${meta.food}`);
    if (meta.letter) parts.push(`letter:${meta.letter}`);
    if (meta.number) parts.push(`num:${meta.number}`);
    if (meta.color) parts.push(`color:${meta.color}`);
    if (meta.shape) parts.push(`shape:${meta.shape}`);
    if (meta.assessmentType) parts.push(`type:${meta.assessmentType}`);
    if (meta.assessmentScore) parts.push(`score:${meta.assessmentScore}`);
    if (meta.milestone) parts.push(`milestone:"${meta.milestone}"`);
    if (meta.temperature) parts.push(`temp:${meta.temperature}`);
    if (meta.mealConsumption) parts.push(`ate:${meta.mealConsumption}`);
    if (meta.napDuration) parts.push(`nap:${meta.napDuration}`);
    if (meta.sleepQuality) parts.push(`sleep:${meta.sleepQuality}`);
    if (meta.friendName) parts.push(`with:${meta.friendName}`);
    if (meta.mood) parts.push(`mood:${meta.mood}`);
    if (meta.injuryType) parts.push(`injury:${meta.injuryType}@${meta.injuryLocation}`);
    if (meta.bottleOz) parts.push(`bottle:${meta.bottleOz}oz`);
    if (meta.diaperType) parts.push(`diaper:${meta.diaperType}`);
    if (meta.pottySuccess !== undefined) parts.push(`potty:${meta.pottySuccess ? "✓" : "✗"}`);
    return parts.length > 0 ? ` | ${parts.join(", ")}` : "";
  };

  return events
    .map((e) => {
      const time = e.createdAt.toISOString().slice(11, 16);
      const cat = catAbbrev[e.category] || e.category;
      const child = `${e.meta.childName}(${e.meta.childAge}m,${e.meta.classroom})`;
      const actor = e.category.startsWith("parent") ? e.meta.parentName.split(" ")[0] : e.meta.teacherName;
      const metaStr = formatMeta(e.meta);
      return `[${time}] ${child} ${cat}:${e.subcategory} by:${actor}${metaStr}`;
    })
    .join("\n");
}

// Grouped by child - very token efficient for context
function toLLMGrouped(events: ActivityEvent[]): string {
  const byChild = new Map<string, ActivityEvent[]>();

  events.forEach((e) => {
    const key = `${e.meta.childName}|${e.meta.childAge}|${e.meta.classroom}`;
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key)!.push(e);
  });

  const lines: string[] = [];

  byChild.forEach((childEvents, key) => {
    const [name, age, classroom] = key.split("|");
    lines.push(`\n## ${name} (${age}m, ${classroom})`);

    // Sort by time
    childEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    childEvents.forEach((e) => {
      const time = e.createdAt.toISOString().slice(11, 16);
      const details: string[] = [];

      if (e.meta.song) details.push(`"${e.meta.song}"`);
      if (e.meta.tale) details.push(`"${e.meta.tale}"`);
      if (e.meta.food) details.push(e.meta.food);
      if (e.meta.letter) details.push(`letter=${e.meta.letter}`);
      if (e.meta.number) details.push(`n=${e.meta.number}`);
      if (e.meta.assessmentScore) details.push(e.meta.assessmentScore);
      if (e.meta.mealConsumption) details.push(`ate:${e.meta.mealConsumption}`);
      if (e.meta.napDuration) details.push(e.meta.napDuration);
      if (e.meta.friendName) details.push(`w/${e.meta.friendName}`);
      if (e.meta.temperature) details.push(e.meta.temperature);

      const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";
      lines.push(`- ${time} ${e.subcategory}${detailStr}`);
    });
  });

  return lines.join("\n");
}

// Ultra-compact: pipe-delimited single line per event
function toLLMPipe(events: ActivityEvent[]): string {
  return events
    .map((e) => {
      const t = e.createdAt.toISOString().slice(0, 16);
      const m = e.meta;
      const extras = [
        m.song, m.tale, m.food, m.letter, m.number,
        m.assessmentScore, m.mealConsumption, m.friendName,
        m.temperature, m.napDuration
      ].filter(Boolean).join(",");
      return `${t}|${m.childName}|${m.childAge}|${e.category}|${e.subcategory}|${m.teacherName}|${extras}`;
    })
    .join("\n");
}

function toCSV(events: ActivityEvent[]): string {
  const flattenObject = (obj: Record<string, any>, prefix = ""): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = value.join(";");
      } else if (value instanceof Date) {
        result[newKey] = value.toISOString();
      } else {
        result[newKey] = value;
      }
    }
    return result;
  };

  const flatEvents = events.map((e) => flattenObject(e as unknown as Record<string, any>));
  const headers = Object.keys(flatEvents[0]);
  const escapeCSV = (val: any): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = flatEvents.map((e) => headers.map((h) => escapeCSV(e[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

// ============================================
// MAIN
// ============================================
type OutputFormat = "json" | "ndjson" | "csv" | "llm" | "llm-grouped" | "llm-pipe" | "all";

interface Options {
  count: number;
  format: OutputFormat;
  outputDir: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    count: 100,
    format: "all",
    outputDir: "./output",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-c":
      case "--count":
        options.count = parseInt(args[++i], 10);
        break;
      case "-f":
      case "--format":
        options.format = args[++i] as OutputFormat;
        break;
      case "-o":
      case "--output":
        options.outputDir = args[++i];
        break;
    }
  }

  return options;
}

function main() {
  const options = parseArgs();
  const events = generateActivityEvents(options.count);

  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `daycare_activity_events_${timestamp}`;

  const outputs: Record<string, { content: string; ext: string }> = {
    json: { content: toJSON(events), ext: "json" },
    ndjson: { content: toNDJSON(events), ext: "ndjson" },
    csv: { content: toCSV(events), ext: "csv" },
    llm: { content: toLLMCompact(events), ext: "txt" },
    "llm-grouped": { content: toLLMGrouped(events), ext: "txt" },
    "llm-pipe": { content: toLLMPipe(events), ext: "txt" },
  };

  if (options.format === "all") {
    for (const [format, { content, ext }] of Object.entries(outputs)) {
      const filePath = path.join(options.outputDir, `${baseName}.${ext}`);
      fs.writeFileSync(filePath, content);
      console.log(`✓ Generated ${format.toUpperCase()}: ${filePath}`);
    }
  } else {
    const { content, ext } = outputs[options.format];
    const filePath = path.join(options.outputDir, `${baseName}.${ext}`);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Generated ${options.format.toUpperCase()}: ${filePath}`);
  }

  console.log(`\n📊 Generated ${options.count} daycare activity events`);
  console.log(`📁 Output directory: ${path.resolve(options.outputDir)}`);
}

main();
