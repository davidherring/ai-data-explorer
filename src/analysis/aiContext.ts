import type { Activity } from '../data/activity.js'
import type { DateRange, MetricKey } from '../state/analysisState.js'
import {
  getMetricDefinition,
  getActivityMetric,
  metricDefinitions,
} from './activityMetrics.js'

export type DatasetProfile = {
  activityCount: number
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
  activityCount: number
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
  | { code: 'sparse-selection'; activityCount: number }
  | { code: 'metric-has-no-finite-values'; metric: MetricKey }
  | { code: 'metric-has-missing-values'; metric: MetricKey; missingCount: number }

const additiveMetricKeys = new Set<MetricKey>([
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
  'elapsedTimeMinutes',
])

export function buildDatasetProfile(activities: readonly Activity[]): DatasetProfile {
  return {
    activityCount: activities.length,
    dateRange: getDateRange(activities),
    years: getSortedUniqueValues(activities.map((activity) => activity.year), compareNumbers),
    sportTypes: getSortedUniqueValues(
      activities.map((activity) => activity.sportType),
      compareStrings,
    ),
    metrics: getMetricKeys().map((metric) =>
      buildDatasetMetricAvailability(activities, metric),
    ),
  }
}

export function summarizeSelection(activities: readonly Activity[]): SelectionSummary {
  const metricSummaries = getMetricKeys().map((metric) =>
    buildSelectionMetricSummary(activities, metric),
  )

  return {
    activityCount: activities.length,
    dateRange: getDateRange(activities),
    metrics: metricSummaries,
    warnings: buildSelectionWarnings(activities.length, metricSummaries),
  }
}

function buildDatasetMetricAvailability(
  activities: readonly Activity[],
  metric: MetricKey,
): DatasetMetricAvailability {
  const definition = getMetricDefinition(metric)
  const finiteCount = getFiniteMetricValues(activities, metric).length
  const missingCount = activities.length - finiteCount

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
  activities: readonly Activity[],
  metric: MetricKey,
): SelectionMetricSummary {
  const definition = getMetricDefinition(metric)
  const values = getFiniteMetricValues(activities, metric)
  const valueSummary = summarizeValues(values)

  return {
    metric,
    label: definition.label,
    unit: definition.unit,
    finiteCount: values.length,
    missingCount: activities.length - values.length,
    ...valueSummary,
    ...(valueSummary !== undefined && additiveMetricKeys.has(metric)
      ? { total: sum(values) }
      : {}),
  }
}

function buildSelectionWarnings(
  activityCount: number,
  metricSummaries: readonly SelectionMetricSummary[],
): SelectionSummaryWarning[] {
  if (activityCount === 0) {
    return [{ code: 'empty-selection' }]
  }

  const warnings: SelectionSummaryWarning[] = []

  if (activityCount < 3) {
    warnings.push({ code: 'sparse-selection', activityCount })
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
  activities: readonly Activity[],
  metric: MetricKey,
): number[] {
  const values: number[] = []

  for (const activity of activities) {
    const value = getActivityMetric(activity, metric)

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

function getDateRange(activities: readonly Activity[]): DateRange | undefined {
  if (activities.length === 0) {
    return undefined
  }

  let start = activities[0].localDate
  let end = activities[0].localDate

  for (const activity of activities.slice(1)) {
    start = activity.localDate < start ? activity.localDate : start
    end = activity.localDate > end ? activity.localDate : end
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
