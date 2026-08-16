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

export type ViewConfiguration = {
  type: ViewType
  xMetric?: MetricKey
  yMetric?: MetricKey
  cumulativeMetric?: MetricKey
  colorBy?: GroupingKey
}

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

export const defaultAnalysisState: AnalysisState = {
  selection: {
    dayMode: 'all',
  },
  view: {
    type: 'trend',
    yMetric: 'averageSpeedMph',
  },
  aggregation: 'raw',
}
