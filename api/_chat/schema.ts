import { z } from 'zod'
import type { DatasetProfile } from '../../src/analysis/aiContext.js'
import type { Ride } from '../../src/data/ride.js'
import type { AnalysisState, MetricKey } from '../../src/state/analysisState.js'

export const MAX_SELECTED_RIDES_FOR_CHAT = 2000
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

const numericRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict()

const activitySelectionSchema = z
  .object({
    dateRange: dateRangeSchema.optional(),
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
    aggregation: z.enum(['raw', 'weekly', 'biweekly']).optional(),
  })
  .strict()

const rideSchema = z
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
    rideCount: z.number(),
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
    selectedRides: z
      .array(rideSchema)
      .max(MAX_SELECTED_RIDES_FOR_CHAT, 'too_many_selected_rides'),
    datasetProfile: datasetProfileSchema,
    selectedRideCount: z.number(),
    totalRideCount: z.number(),
    dataSource: z.enum(['demo', 'strava']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.selectedRideCount !== value.selectedRides.length) {
      context.addIssue({
        code: 'custom',
        path: ['selectedRideCount'],
        message: 'selectedRideCount must match submitted ride count',
      })
    }
  })

export const relationshipToolInputSchema = z
  .object({
    xMetric: metricKeySchema,
    yMetric: metricKeySchema,
  })
  .strict()

export type ChatRequest = z.infer<typeof chatRequestSchema> & {
  currentAnalysisState: AnalysisState
  selectedRides: Ride[]
  datasetProfile: DatasetProfile
}

export type ChatUIMessage = z.infer<typeof uiMessageSchema>
