import type { DayOfWeek } from '../data/ride.js'

export type DateRange = {
  start?: string
  end?: string
}

export type NumericRange = {
  min?: number
  max?: number
}

export type DayMode = 'all' | 'weekday' | 'weekend'

export type ActivitySelection = {
  dateRange?: DateRange
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
  | 'elapsedTimeMinutes'
  | 'temperatureF'

export type ViewType = 'trend' | 'relationship' | 'seasonal' | 'cumulative'

export type GroupingKey = 'year' | 'month' | 'dayOfWeek' | 'dayMode'

export type AggregationMode = 'raw' | 'weekly' | 'biweekly'

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
  yMetric: MetricKey
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
  aggregation?: AggregationMode
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
  aggregation: 'raw',
}
