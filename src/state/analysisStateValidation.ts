import { z } from 'zod'
import {
  cumulativeMetricKeyValues,
  dayModeValues,
  dayOfWeekValues,
  groupingKeyValues,
  metricKeyValues,
  type AnalysisState,
} from './analysisState.js'

export const metricKeySchema = z.enum(metricKeyValues)

export const cumulativeMetricKeySchema = z.enum(cumulativeMetricKeyValues)

export const dayOfWeekSchema = z.enum(dayOfWeekValues)

export const dayModeSchema = z.enum(dayModeValues)

export const groupingKeySchema = z.enum(groupingKeyValues)

export const dateRangeSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .strict()

export const monthDaySchema = z
  .object({
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  })
  .strict()
  .refine(isValidMonthDay, {
    message: 'Invalid month/day',
  })

export const recurringDateRangeSchema = z
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

export const numericRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict()

export const activitySelectionSchema = z
  .object({
    dateRange: dateRangeSchema.optional(),
    recurringDateRange: recurringDateRangeSchema,
    years: z.array(z.number()),
    daysOfWeek: z.array(dayOfWeekSchema),
    distanceMiles: numericRangeSchema.optional(),
    elevationGainFeet: numericRangeSchema.optional(),
    sportType: z.string().optional(),
  })
  .strict()

export const trendViewSchema = z
  .object({
    type: z.literal('trend'),
    yMetric: metricKeySchema,
  })
  .strict()

export const relationshipViewSchema = z
  .object({
    type: z.literal('relationship'),
    xMetric: metricKeySchema,
    yMetric: metricKeySchema,
  })
  .strict()

export const seasonalViewSchema = z
  .object({
    type: z.literal('seasonal'),
    yMetric: metricKeySchema,
    aggregation: z.literal('biweekly-median'),
  })
  .strict()

export const cumulativeViewSchema = z
  .object({
    type: z.literal('cumulative'),
    yMetric: cumulativeMetricKeySchema,
    accumulation: z.literal('continuous'),
  })
  .strict()

export const viewConfigurationSchema = z.discriminatedUnion('type', [
  trendViewSchema,
  relationshipViewSchema,
  seasonalViewSchema,
  cumulativeViewSchema,
])

export const analysisStateSchema = z
  .object({
    selection: activitySelectionSchema,
    comparison: activitySelectionSchema.optional(),
    view: viewConfigurationSchema,
    grouping: groupingKeySchema.optional(),
  })
  .strict()

export function parseAnalysisState(value: unknown): AnalysisState {
  return analysisStateSchema.parse(value) as AnalysisState
}

export function safeParseAnalysisState(value: unknown) {
  return analysisStateSchema.safeParse(value)
}

export function isValidMonthDay(monthDay: { month: number; day: number }): boolean {
  return monthDay.day <= getDaysInMonth(monthDay.month)
}

export function compareMonthDay(
  left: { month: number; day: number },
  right: { month: number; day: number },
): number {
  return left.month - right.month || left.day - right.day
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
