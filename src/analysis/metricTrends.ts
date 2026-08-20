import type { Ride } from '../data/ride.js'
import type { DateRange, MetricKey } from '../state/analysisState.js'
import { getMetricDefinition, getRideMetric } from './rideMetrics.js'

export type MetricTrendDirection =
  | 'increasing'
  | 'decreasing'
  | 'flat'
  | 'unavailable'

export type MetricTrendStatus =
  | 'ready'
  | 'empty-selection'
  | 'insufficient-valid-points'
  | 'zero-time-variance'
  | 'zero-metric-variance'

export type MetricTrendWarning =
  | { code: 'empty-selection' }
  | { code: 'insufficient-valid-points'; validPointCount: number }
  | { code: 'metric-has-no-finite-values'; metric: MetricKey }
  | { code: 'metric-has-missing-values'; metric: MetricKey; missingCount: number }
  | { code: 'zero-time-variance' }
  | { code: 'zero-metric-variance'; metric: MetricKey }
  | {
      code: 'large-date-gap'
      largestGapDays: number
      timeSpanDays: number
      start: string
      end: string
    }

export type MetricTrendGapSummary = {
  largestGapDays: number
  start?: string
  end?: string
}

export type MetricTrendAnalysis = {
  metric: MetricKey
  label: string
  unit: string
  sampleCount: number
  validPointCount: number
  missingCount: number
  dateRange?: DateRange
  timeSpanDays?: number
  metricMin?: number
  metricMax?: number
  slopePerDay?: number
  slopePerYear?: number
  estimatedChangeOverRange?: number
  pearsonR?: number
  rSquared?: number
  direction: MetricTrendDirection
  status: MetricTrendStatus
  gapSummary?: MetricTrendGapSummary
  warnings: MetricTrendWarning[]
}

type TrendPoint = {
  localDate: string
  dayOrdinal: number
  value: number
}

const minimumValidPointCount = 3
const daysPerYear = 365.25
const millisecondsPerDay = 86_400_000

export function calculateMetricTrend(
  rides: readonly Ride[],
  metric: MetricKey,
): MetricTrendAnalysis {
  const points = getTrendPoints(rides, metric)
  const baseResult = buildBaseResult(rides.length, points, metric)

  if (rides.length === 0) {
    return {
      ...baseResult,
      direction: 'unavailable',
      status: 'empty-selection',
      warnings: [{ code: 'empty-selection' }],
    }
  }

  if (points.length < minimumValidPointCount) {
    return {
      ...baseResult,
      direction: 'unavailable',
      status: 'insufficient-valid-points',
      warnings: buildBaseWarnings(metric, baseResult),
    }
  }

  const xValues = points.map((point) => point.dayOrdinal)
  const yValues = points.map((point) => point.value)
  const xMean = mean(xValues)
  const yMean = mean(yValues)
  let covarianceNumerator = 0
  let xVarianceSum = 0
  let yVarianceSum = 0

  for (const point of points) {
    const xDeviation = point.dayOrdinal - xMean
    const yDeviation = point.value - yMean

    covarianceNumerator += xDeviation * yDeviation
    xVarianceSum += xDeviation * xDeviation
    yVarianceSum += yDeviation * yDeviation
  }

  if (xVarianceSum === 0) {
    return {
      ...baseResult,
      direction: 'unavailable',
      status: 'zero-time-variance',
      warnings: [
        ...buildBaseWarnings(metric, baseResult),
        { code: 'zero-time-variance' },
      ],
    }
  }

  const slopePerDay = covarianceNumerator / xVarianceSum
  const slopePerYear = slopePerDay * daysPerYear
  const estimatedChangeOverRange = slopePerDay * (baseResult.timeSpanDays ?? 0)

  if (yVarianceSum === 0) {
    return {
      ...baseResult,
      slopePerDay: 0,
      slopePerYear: 0,
      estimatedChangeOverRange: 0,
      direction: 'flat',
      status: 'zero-metric-variance',
      warnings: [
        ...buildBaseWarnings(metric, baseResult),
        { code: 'zero-metric-variance', metric },
      ],
    }
  }

  const pearsonR = covarianceNumerator / Math.sqrt(xVarianceSum * yVarianceSum)

  return {
    ...baseResult,
    slopePerDay,
    slopePerYear,
    estimatedChangeOverRange,
    pearsonR,
    rSquared: pearsonR * pearsonR,
    direction: getDirection(slopePerDay),
    status: 'ready',
    warnings: buildBaseWarnings(metric, baseResult),
  }
}

function getTrendPoints(
  rides: readonly Ride[],
  metric: MetricKey,
): TrendPoint[] {
  const points: TrendPoint[] = []

  for (const ride of rides) {
    const value = getRideMetric(ride, metric)

    if (value === undefined || !Number.isFinite(value)) {
      continue
    }

    points.push({
      localDate: ride.localDate,
      dayOrdinal: parseLocalDateDayOrdinal(ride.localDate),
      value,
    })
  }

  return points
}

function buildBaseResult(
  sampleCount: number,
  points: readonly TrendPoint[],
  metric: MetricKey,
): Omit<MetricTrendAnalysis, 'direction' | 'status' | 'warnings'> {
  const definition = getMetricDefinition(metric)
  const result: Omit<MetricTrendAnalysis, 'direction' | 'status' | 'warnings'> = {
    metric,
    label: definition.label,
    unit: definition.unit,
    sampleCount,
    validPointCount: points.length,
    missingCount: sampleCount - points.length,
  }

  if (points.length === 0) {
    return result
  }

  const sortedPoints = [...points].sort(
    (left, right) =>
      left.dayOrdinal - right.dayOrdinal ||
      left.localDate.localeCompare(right.localDate),
  )
  const firstPoint = sortedPoints[0]
  const lastPoint = sortedPoints[sortedPoints.length - 1]
  const metricRange = getMetricRange(points)
  const gapSummary = getGapSummary(sortedPoints)

  return {
    ...result,
    dateRange: {
      start: firstPoint.localDate,
      end: lastPoint.localDate,
    },
    timeSpanDays: lastPoint.dayOrdinal - firstPoint.dayOrdinal,
    metricMin: metricRange.min,
    metricMax: metricRange.max,
    ...(gapSummary !== undefined ? { gapSummary } : {}),
  }
}

function getMetricRange(points: readonly TrendPoint[]): {
  min: number
  max: number
} {
  let min = points[0].value
  let max = points[0].value

  for (const point of points.slice(1)) {
    min = Math.min(min, point.value)
    max = Math.max(max, point.value)
  }

  return { min, max }
}

function getGapSummary(
  sortedPoints: readonly TrendPoint[],
): MetricTrendGapSummary | undefined {
  if (sortedPoints.length < 2) {
    return undefined
  }

  let largestGapDays = 0
  let start: string | undefined
  let end: string | undefined

  for (let index = 0; index < sortedPoints.length - 1; index += 1) {
    const current = sortedPoints[index]
    const next = sortedPoints[index + 1]
    const gapDays = next.dayOrdinal - current.dayOrdinal

    if (gapDays > largestGapDays) {
      largestGapDays = gapDays
      start = current.localDate
      end = next.localDate
    }
  }

  return {
    largestGapDays,
    ...(start !== undefined ? { start } : {}),
    ...(end !== undefined ? { end } : {}),
  }
}

function buildBaseWarnings(
  metric: MetricKey,
  result: Pick<
    MetricTrendAnalysis,
    'validPointCount' | 'missingCount' | 'gapSummary' | 'timeSpanDays'
  >,
): MetricTrendWarning[] {
  const warnings: MetricTrendWarning[] = []

  if (result.validPointCount < minimumValidPointCount) {
    warnings.push({
      code: 'insufficient-valid-points',
      validPointCount: result.validPointCount,
    })
  }

  if (result.validPointCount === 0) {
    warnings.push({ code: 'metric-has-no-finite-values', metric })
  }

  if (result.missingCount > 0) {
    warnings.push({
      code: 'metric-has-missing-values',
      metric,
      missingCount: result.missingCount,
    })
  }

  if (
    result.validPointCount >= minimumValidPointCount &&
    result.gapSummary?.start !== undefined &&
    result.gapSummary.end !== undefined &&
    result.timeSpanDays !== undefined &&
    result.timeSpanDays > 0 &&
    result.gapSummary.largestGapDays > result.timeSpanDays / 2
  ) {
    warnings.push({
      code: 'large-date-gap',
      largestGapDays: result.gapSummary.largestGapDays,
      timeSpanDays: result.timeSpanDays,
      start: result.gapSummary.start,
      end: result.gapSummary.end,
    })
  }

  return warnings
}

function getDirection(slopePerDay: number): MetricTrendDirection {
  if (slopePerDay > 0) {
    return 'increasing'
  }

  if (slopePerDay < 0) {
    return 'decreasing'
  }

  return 'flat'
}

function parseLocalDateDayOrdinal(localDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)

  if (!match) {
    return Number.NaN
  }

  const [, year, month, day] = match

  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / millisecondsPerDay
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}
