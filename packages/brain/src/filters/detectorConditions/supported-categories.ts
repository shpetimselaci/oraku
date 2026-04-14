import type { DetectorCondition } from '../../types'

export const supportedCategories = (categories: string[]): DetectorCondition =>
  (_, context) => !context.category || categories.includes(context.category as string)
