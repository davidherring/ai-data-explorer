import { z } from 'zod'
import type { DatasetProfile } from '../../src/analysis/aiContext.js'
import type { Activity } from '../../src/data/activity.js'
import type { AnalysisState } from '../../src/state/analysisState.js'
import {
  analysisStateSchema,
  dateRangeSchema,
  dayModeSchema,
  dayOfWeekSchema,
  metricKeySchema,
} from '../../src/state/analysisStateValidation.js'
import { viewSuggestionChangeSchema } from '../../src/state/viewSuggestions.js'

export const MAX_SELECTED_ACTIVITIES_FOR_CHAT = 2000
export const MAX_CHAT_REQUEST_BYTES = 3_000_000

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
    averageSpeedMph: z.number(),
    elevationGainFeet: z.number(),
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

export const recentlyAppliedViewSuggestionSchema = z
  .object({
    label: z.string().min(1),
    changes: z.array(viewSuggestionChangeSchema),
    appliedStateFingerprint: z.string().min(1),
  })
  .strict()

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
    recentlyAppliedViewSuggestion: recentlyAppliedViewSuggestionSchema.optional(),
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
      groups: z.array(dayModeSchema.exclude(['all'])).optional(),
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
