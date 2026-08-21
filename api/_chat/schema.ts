import { z } from 'zod'
import type { DatasetProfile } from '../../src/analysis/aiContext.js'
import type { Activity } from '../../src/data/activity.js'
import type { AnalysisState, MetricKey } from '../../src/state/analysisState.js'

export const MAX_SELECTED_ACTIVITIES_FOR_CHAT = 2000
export const MAX_CHAT_REQUEST_BYTES = 3_000_000

export const metricKeyValues = [
  'averageSpeedMph',
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
  'elapsedTimeMinutes',
  'temperatureF',
] as const satisfies readonly MetricKey[]

const dayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

const metricKeySchema = z.enum(metricKeyValues)

const dateRangeSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .strict()

const monthDaySchema = z
  .object({
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  })
  .strict()
  .refine(isValidMonthDay, {
    message: 'Invalid month/day',
  })

const recurringDateRangeSchema = z
  .object({
    type: z.literal('recurring-month-day'),
    start: monthDaySchema,
    end: monthDaySchema,
  })
  .strict()
  .refine((range) => compareMonthDay(range.start, range.end) <= 0, {
    message: 'Recurring date range start must be before or equal to end',
    path: ['start'],
  })

const numericRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict()

const activitySelectionSchema = z
  .object({
    dateRange: dateRangeSchema.optional(),
    recurringDateRange: recurringDateRangeSchema.optional(),
    years: z.array(z.number()).optional(),
    dayMode: z.enum(['all', 'weekday', 'weekend']).optional(),
    daysOfWeek: z.array(dayOfWeekSchema).optional(),
    distanceMiles: numericRangeSchema.optional(),
    elevationGainFeet: numericRangeSchema.optional(),
    sportType: z.string().optional(),
  })
  .strict()

const trendViewSchema = z
  .object({
    type: z.literal('trend'),
    yMetric: metricKeySchema,
  })
  .strict()

const relationshipViewSchema = z
  .object({
    type: z.literal('relationship'),
    xMetric: metricKeySchema,
    yMetric: metricKeySchema,
  })
  .strict()

const seasonalViewSchema = z
  .object({
    type: z.literal('seasonal'),
    yMetric: metricKeySchema,
    aggregation: z.literal('biweekly-median'),
  })
  .strict()

const cumulativeViewSchema = z
  .object({
    type: z.literal('cumulative'),
    yMetric: metricKeySchema,
    accumulation: z.literal('continuous'),
  })
  .strict()

const analysisStateSchema = z
  .object({
    selection: activitySelectionSchema,
    comparison: activitySelectionSchema.optional(),
    view: z.discriminatedUnion('type', [
      trendViewSchema,
      relationshipViewSchema,
      seasonalViewSchema,
      cumulativeViewSchema,
    ]),
    grouping: z.enum(['year', 'month', 'dayOfWeek', 'dayMode']).optional(),
  })
  .strict()

const activitySchema = z
  .object({
    id: z.string(),
    startTime: z.string(),
    localDate: z.string(),
    year: z.number(),
    month: z.number(),
    weekOfYear: z.number(),
    dayOfWeek: dayOfWeekSchema,
    isWeekend: z.boolean(),
    distanceMiles: z.number(),
    movingTimeMinutes: z.number(),
    elapsedTimeMinutes: z.number(),
    averageSpeedMph: z.number(),
    elevationGainFeet: z.number(),
    temperatureF: z.number().optional(),
    sportType: z.string(),
    trainer: z.boolean(),
    commute: z.boolean(),
    manual: z.boolean(),
  })
  .strict()

const datasetMetricAvailabilitySchema = z
  .object({
    metric: metricKeySchema,
    label: z.string(),
    unit: z.string(),
    optional: z.boolean(),
    finiteCount: z.number(),
    missingCount: z.number(),
    available: z.boolean(),
  })
  .strict()

const datasetProfileSchema = z
  .object({
    activityCount: z.number(),
    dateRange: dateRangeSchema.optional(),
    years: z.array(z.number()),
    sportTypes: z.array(z.string()),
    metrics: z.array(datasetMetricAvailabilitySchema),
  })
  .strict()

const uiMessagePartSchema = z
  .object({
    type: z.string(),
  })
  .passthrough()

const uiMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(['system', 'user', 'assistant']),
    parts: z.array(uiMessagePartSchema),
    metadata: z.unknown().optional(),
  })
  .passthrough()

export const chatRequestSchema = z
  .object({
    id: z.string().optional(),
    messages: z.array(uiMessageSchema),
    trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
    messageId: z.string().optional(),
    currentAnalysisState: analysisStateSchema,
    selectedActivities: z
      .array(activitySchema)
      .max(MAX_SELECTED_ACTIVITIES_FOR_CHAT, 'too_many_selected_activities'),
    datasetProfile: datasetProfileSchema,
    selectedActivityCount: z.number(),
    totalActivityCount: z.number(),
    dataSource: z.enum(['demo', 'strava']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.selectedActivityCount !== value.selectedActivities.length) {
      context.addIssue({
        code: 'custom',
        path: ['selectedActivityCount'],
        message: 'selectedActivityCount must match submitted activity count',
      })
    }
  })

export const relationshipToolInputSchema = z
  .object({
    xMetric: metricKeySchema,
    yMetric: metricKeySchema,
  })
  .strict()

export const calculateTrendToolInputSchema = z
  .object({
    metric: metricKeySchema,
  })
  .strict()

const monthGroupSchema = z.number().int().min(1).max(12)
const dayModeGroupSchema = z.enum(['weekday', 'weekend'])

export const compareGroupsToolInputSchema = z.discriminatedUnion('groupBy', [
  z
    .object({
      groupBy: z.literal('year'),
      groups: z.array(z.number()).optional(),
    })
    .strict(),
  z
    .object({
      groupBy: z.literal('month'),
      groups: z.array(monthGroupSchema).optional(),
    })
    .strict(),
  z
    .object({
      groupBy: z.literal('dayMode'),
      groups: z.array(dayModeGroupSchema).optional(),
    })
    .strict(),
  z
    .object({
      groupBy: z.literal('dayOfWeek'),
      groups: z.array(dayOfWeekSchema).optional(),
    })
    .strict(),
])

export type ChatRequest = z.infer<typeof chatRequestSchema> & {
  currentAnalysisState: AnalysisState
  selectedActivities: Activity[]
  datasetProfile: DatasetProfile
}

export type ChatUIMessage = z.infer<typeof uiMessageSchema>

function isValidMonthDay(monthDay: { month: number; day: number }): boolean {
  return monthDay.day <= getDaysInMonth(monthDay.month)
}

function getDaysInMonth(month: number): number {
  switch (month) {
    case 2:
      return 29
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

function compareMonthDay(
  left: { month: number; day: number },
  right: { month: number; day: number },
): number {
  return left.month - right.month || left.day - right.day
}
