import { z } from 'zod'

// ─── Event ────────────────────────────────────────────────────────────────────

export const EventSchema = z.object({
  externalRef: z.string(),
  createdAt: z.string(),
}).passthrough()

// ─── SDKDetectorSchema ────────────────────────────────────────────────────────

const NotificationType = z.enum(['reminder', 'warning', 'nudge', 'suggestion', 'achievement', 'insight'])
const DateFilter = z.object({ unit: z.enum(['day', 'week', 'month', 'year']), value: z.number() }).nullable()
const NumericRecord = z.record(z.string(), z.number())

const Base = z.object({
  name: z.string(),
  notificationType: NotificationType.optional(),
  marker: z.string().optional(),
  scheduleAt: z.string().optional(),
})

export const SDKDetectorSchemaZod = z.discriminatedUnion('type', [
  Base.extend({
    type: z.literal('streak-ongoing'),
    minRepeat: z.number().optional(),
    precision: z.enum(['day', 'time']).optional(),
  }),
  Base.extend({
    type: z.literal('streak-break'),
    minRepeat: z.number().optional(),
    precision: z.enum(['day', 'time']).optional(),
  }),
  Base.extend({
    type: z.literal('checklist'),
    expected: z.array(z.string()).optional(),
    todayOnly: z.boolean().optional(),
    dateFilter: DateFilter.optional(),
  }),
  Base.extend({
    type: z.literal('milestone'),
    expected: z.array(z.string()).optional(),
    todayOnly: z.boolean().optional(),
  }),
  Base.extend({
    type: z.literal('threshold'),
    extract: z.object({ path: z.string() }),
    operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq']),
    value: z.number(),
    aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
    todayOnly: z.boolean().optional(),
  }),
  Base.extend({
    type: z.literal('item-analysis'),
    extract: z.object({ path: z.string() }),
    lookup: z.object({
      map: z.record(z.string(), NumericRecord).optional(),
      api: z.object({
        urlTemplate: z.string(),
        responsePath: z.string().optional(),
        timeout: z.number().optional(),
      }).optional(),
    }),
    targets: NumericRecord,
    aggregate: z.enum(['sum', 'avg']).optional(),
    todayOnly: z.boolean().optional(),
    dateFilter: DateFilter.optional(),
  }),
])
