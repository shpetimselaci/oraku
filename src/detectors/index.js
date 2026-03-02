const AnomalyDetector = require('./AnomalyDetector')
const DailyNutritionDetector = require('./DailyNutritionDetector')
const RandomEngagementDetector = require('./RandomEngagementDetector')
const RecurringEventDetector = require('./RecurringEventDetector')
const DailyCurriculumDetector = require('./DailyCurriculumDetector')

module.exports = [
  AnomalyDetector,
  DailyNutritionDetector,
  RecurringEventDetector,
  RandomEngagementDetector,
  DailyCurriculumDetector
]
