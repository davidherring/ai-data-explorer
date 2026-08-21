import type { Activity } from '../data/activity.js'
import type { MetricKey } from '../state/analysisState.js'
import { getActivityMetric } from './activityMetrics.js'

export type MetricRelationshipStatus =
  | 'ready'
  | 'insufficient-valid-pairs'
  | 'zero-x-variance'
  | 'zero-y-variance'

export type MetricRelationshipResult = {
  xMetric: MetricKey
  yMetric: MetricKey
  sampleCount: number
  validPairCount: number
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  pearsonR?: number
  status: MetricRelationshipStatus
}

type MetricPair = {
  x: number
  y: number
}

export type MetricRelationshipPoint = MetricPair & {
  activity: Activity
}

export function relationshipBetweenMetrics(
  activities: readonly Activity[],
  xMetric: MetricKey,
  yMetric: MetricKey,
): MetricRelationshipResult {
  const pairs = getMetricRelationshipPoints(activities, xMetric, yMetric)
  const baseResult = buildBaseResult(activities.length, pairs, xMetric, yMetric)

  if (pairs.length < 3) {
    return {
      ...baseResult,
      status: 'insufficient-valid-pairs',
    }
  }

  const { xMean, yMean } = calculateMeans(pairs)
  let covarianceNumerator = 0
  let xVarianceSum = 0
  let yVarianceSum = 0

  for (const pair of pairs) {
    const xDeviation = pair.x - xMean
    const yDeviation = pair.y - yMean

    covarianceNumerator += xDeviation * yDeviation
    xVarianceSum += xDeviation * xDeviation
    yVarianceSum += yDeviation * yDeviation
  }

  if (xVarianceSum === 0) {
    return {
      ...baseResult,
      status: 'zero-x-variance',
    }
  }

  if (yVarianceSum === 0) {
    return {
      ...baseResult,
      status: 'zero-y-variance',
    }
  }

  return {
    ...baseResult,
    pearsonR: covarianceNumerator / Math.sqrt(xVarianceSum * yVarianceSum),
    status: 'ready',
  }
}

export function getMetricRelationshipPoints(
  activities: readonly Activity[],
  xMetric: MetricKey,
  yMetric: MetricKey,
): MetricRelationshipPoint[] {
  const points: MetricRelationshipPoint[] = []

  for (const activity of activities) {
    const x = getActivityMetric(activity, xMetric)
    const y = getActivityMetric(activity, yMetric)

    if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ activity, x, y })
    }
  }

  return points
}

function buildBaseResult(
  sampleCount: number,
  pairs: readonly MetricPair[],
  xMetric: MetricKey,
  yMetric: MetricKey,
): Omit<MetricRelationshipResult, 'status' | 'pearsonR'> {
  const result: Omit<MetricRelationshipResult, 'status' | 'pearsonR'> = {
    xMetric,
    yMetric,
    sampleCount,
    validPairCount: pairs.length,
  }

  if (pairs.length === 0) {
    return result
  }

  let xMin = pairs[0].x
  let xMax = pairs[0].x
  let yMin = pairs[0].y
  let yMax = pairs[0].y

  for (const pair of pairs.slice(1)) {
    xMin = Math.min(xMin, pair.x)
    xMax = Math.max(xMax, pair.x)
    yMin = Math.min(yMin, pair.y)
    yMax = Math.max(yMax, pair.y)
  }

  return {
    ...result,
    xMin,
    xMax,
    yMin,
    yMax,
  }
}

function calculateMeans(pairs: readonly MetricPair[]): {
  xMean: number
  yMean: number
} {
  let xTotal = 0
  let yTotal = 0

  for (const pair of pairs) {
    xTotal += pair.x
    yTotal += pair.y
  }

  return {
    xMean: xTotal / pairs.length,
    yMean: yTotal / pairs.length,
  }
}
