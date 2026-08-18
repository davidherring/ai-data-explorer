import type { DayOfWeek } from '../data/ride.ts'

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

export type FutureViewConfiguration = {
  type: 'seasonal' | 'cumulative'
}

export type ViewConfiguration =
  | TrendViewConfiguration
  | RelationshipViewConfiguration
  | FutureViewConfiguration

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

export const defaultAnalysisState: AnalysisState = {
  selection: {
    dayMode: 'all',
  },
  view: { ...defaultTrendView },
  aggregation: 'raw',
}
