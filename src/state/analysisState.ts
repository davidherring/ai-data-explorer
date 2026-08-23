import type { DayOfWeek } from '../data/activity.js'

export const dayOfWeekValues = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly DayOfWeek[]

export type DateRange = {
  start?: string
  end?: string
}

export type MonthDay = {
  month: number
  day: number
}

export type RecurringDateRange = {
  type: 'recurring-month-day'
  start: MonthDay
  end: MonthDay
}

export type NumericRange = {
  min?: number
  max?: number
}

export type DayMode = 'all' | 'weekday' | 'weekend'

export const dayModeValues = [
  'all',
  'weekday',
  'weekend',
] as const satisfies readonly DayMode[]

export type ActivitySelection = {
  dateRange?: DateRange
  recurringDateRange?: RecurringDateRange
  years?: number[]
  dayMode?: DayMode
  daysOfWeek?: DayOfWeek[]
  distanceMiles?: NumericRange
  elevationGainFeet?: NumericRange
  sportType?: string
}

export type MetricKey =
  | 'averageSpeedMph'
  | 'distanceMiles'
  | 'elevationGainFeet'
  | 'movingTimeMinutes'

export const metricKeyValues = [
  'averageSpeedMph',
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly MetricKey[]

export type CumulativeMetricKey = Exclude<MetricKey, 'averageSpeedMph'>

export const cumulativeMetricKeyValues = [
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly CumulativeMetricKey[]

export type ViewType = 'trend' | 'relationship' | 'seasonal' | 'cumulative'

export type GroupingKey = 'year' | 'month' | 'dayOfWeek' | 'dayMode'

export const groupingKeyValues = [
  'year',
  'month',
  'dayOfWeek',
  'dayMode',
] as const satisfies readonly GroupingKey[]

export type TrendViewConfiguration = {
  type: 'trend'
  yMetric: MetricKey
}

export type RelationshipViewConfiguration = {
  type: 'relationship'
  xMetric: MetricKey
  yMetric: MetricKey
}

export type SeasonalAggregationMode = 'biweekly-median'

export type SeasonalViewConfiguration = {
  type: 'seasonal'
  yMetric: MetricKey
  aggregation: SeasonalAggregationMode
}

export type CumulativeAccumulationMode = 'continuous'

export type CumulativeViewConfiguration = {
  type: 'cumulative'
  yMetric: CumulativeMetricKey
  accumulation: CumulativeAccumulationMode
}

export type ViewConfiguration =
  | TrendViewConfiguration
  | RelationshipViewConfiguration
  | SeasonalViewConfiguration
  | CumulativeViewConfiguration

export type AnalysisState = {
  selection: ActivitySelection
  comparison?: ActivitySelection
  view: ViewConfiguration
  grouping?: GroupingKey
}

export const supportedViewTypes = [
  'trend',
  'relationship',
  'seasonal',
  'cumulative',
] as const satisfies readonly ViewType[]

export const defaultTrendView: TrendViewConfiguration = {
  type: 'trend',
  yMetric: 'averageSpeedMph',
}

export const defaultRelationshipView: RelationshipViewConfiguration = {
  type: 'relationship',
  xMetric: 'elevationGainFeet',
  yMetric: 'averageSpeedMph',
}

export const defaultSeasonalView: SeasonalViewConfiguration = {
  type: 'seasonal',
  yMetric: 'averageSpeedMph',
  aggregation: 'biweekly-median',
}

export const defaultCumulativeView: CumulativeViewConfiguration = {
  type: 'cumulative',
  yMetric: 'distanceMiles',
  accumulation: 'continuous',
}

export const defaultAnalysisState: AnalysisState = {
  selection: {
    dayMode: 'all',
  },
  view: { ...defaultTrendView },
}
