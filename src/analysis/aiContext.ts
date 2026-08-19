import type { Ride } from '../data/ride.ts'
import type { DateRange, MetricKey } from '../state/analysisState.ts'
import {
  getMetricDefinition,
  getRideMetric,
  metricDefinitions,
} from './rideMetrics.ts'

export type DatasetProfile = {
  rideCount: number
  dateRange?: DateRange
  years: number[]
  sportTypes: string[]
  metrics: DatasetMetricAvailability[]
}

export type DatasetMetricAvailability = {
  metric: MetricKey
  label: string
  unit: string
  optional: boolean
  finiteCount: number
  missingCount: number
  available: boolean
}

export type SelectionSummary = {
  rideCount: number
  dateRange?: DateRange
  metrics: SelectionMetricSummary[]
  warnings: SelectionSummaryWarning[]
}

export type SelectionMetricSummary = {
  metric: MetricKey
  label: string
  unit: string
  finiteCount: number
  missingCount: number
  mean?: number
  median?: number
  min?: number
  max?: number
  total?: number
}

export type SelectionSummaryWarning =
  | { code: 'empty-selection' }
  | { code: 'sparse-selection'; rideCount: number }
  | { code: 'metric-has-no-finite-values'; metric: MetricKey }
  | { code: 'metric-has-missing-values'; metric: MetricKey; missingCount: number }

const additiveMetricKeys = new Set<MetricKey>([
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
  'elapsedTimeMinutes',
])

export function buildDatasetProfile(rides: readonly Ride[]): DatasetProfile {
  return {
    rideCount: rides.length,
    dateRange: getDateRange(rides),
    years: getSortedUniqueValues(rides.map((ride) => ride.year), compareNumbers),
    sportTypes: getSortedUniqueValues(
      rides.map((ride) => ride.sportType),
      compareStrings,
    ),
    metrics: getMetricKeys().map((metric) =>
      buildDatasetMetricAvailability(rides, metric),
    ),
  }
}

export function summarizeSelection(rides: readonly Ride[]): SelectionSummary {
  const metricSummaries = getMetricKeys().map((metric) =>
    buildSelectionMetricSummary(rides, metric),
  )

  return {
    rideCount: rides.length,
    dateRange: getDateRange(rides),
    metrics: metricSummaries,
    warnings: buildSelectionWarnings(rides.length, metricSummaries),
  }
}

function buildDatasetMetricAvailability(
  rides: readonly Ride[],
  metric: MetricKey,
): DatasetMetricAvailability {
  const definition = getMetricDefinition(metric)
  const finiteCount = getFiniteMetricValues(rides, metric).length
  const missingCount = rides.length - finiteCount

  return {
    metric,
    label: definition.label,
    unit: definition.unit,
    optional: definition.optional === true,
    finiteCount,
    missingCount,
    available: finiteCount > 0,
  }
}

function buildSelectionMetricSummary(
  rides: readonly Ride[],
  metric: MetricKey,
): SelectionMetricSummary {
  const definition = getMetricDefinition(metric)
  const values = getFiniteMetricValues(rides, metric)
  const valueSummary = summarizeValues(values)

  return {
    metric,
    label: definition.label,
    unit: definition.unit,
    finiteCount: values.length,
    missingCount: rides.length - values.length,
    ...valueSummary,
    ...(valueSummary !== undefined && additiveMetricKeys.has(metric)
      ? { total: sum(values) }
      : {}),
  }
}

function buildSelectionWarnings(
  rideCount: number,
  metricSummaries: readonly SelectionMetricSummary[],
): SelectionSummaryWarning[] {
  if (rideCount === 0) {
    return [{ code: 'empty-selection' }]
  }

  const warnings: SelectionSummaryWarning[] = []

  if (rideCount < 3) {
    warnings.push({ code: 'sparse-selection', rideCount })
  }

  for (const summary of metricSummaries) {
    if (summary.finiteCount === 0) {
      warnings.push({
        code: 'metric-has-no-finite-values',
        metric: summary.metric,
      })
    }

    if (summary.missingCount > 0) {
      warnings.push({
        code: 'metric-has-missing-values',
        metric: summary.metric,
        missingCount: summary.missingCount,
      })
    }
  }

  return warnings
}

function getFiniteMetricValues(
  rides: readonly Ride[],
  metric: MetricKey,
): number[] {
  const values: number[] = []

  for (const ride of rides) {
    const value = getRideMetric(ride, metric)

    if (value !== undefined && Number.isFinite(value)) {
      values.push(value)
    }
  }

  return values
}

function summarizeValues(values: readonly number[]):
  | {
      mean: number
      median: number
      min: number
      max: number
    }
  | undefined {
  if (values.length === 0) {
    return undefined
  }

  let min = values[0]
  let max = values[0]

  for (const value of values.slice(1)) {
    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  return {
    mean: sum(values) / values.length,
    median: median(values),
    min,
    max,
  }
}

function median(values: readonly number[]): number {
  const sortedValues = [...values].sort(compareNumbers)
  const middleIndex = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex]
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function getDateRange(rides: readonly Ride[]): DateRange | undefined {
  if (rides.length === 0) {
    return undefined
  }

  let start = rides[0].localDate
  let end = rides[0].localDate

  for (const ride of rides.slice(1)) {
    start = ride.localDate < start ? ride.localDate : start
    end = ride.localDate > end ? ride.localDate : end
  }

  return { start, end }
}

function getSortedUniqueValues<T>(
  values: readonly T[],
  compare: (a: T, b: T) => number,
): T[] {
  return Array.from(new Set(values)).sort(compare)
}

function getMetricKeys(): MetricKey[] {
  return Object.values(metricDefinitions).map((definition) => definition.key)
}

function compareNumbers(a: number, b: number): number {
  return a - b
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b)
}
