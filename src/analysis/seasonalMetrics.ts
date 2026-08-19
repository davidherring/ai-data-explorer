import type { Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getRideMetric } from './rideMetrics.ts'

export type SeasonalMetricBucket = {
  year: number
  bucketIndex: number
  startWeek: number
  endWeek: number
  value: number
  sampleCount: number
  sparse: boolean
}

type SeasonalBucketAccumulator = {
  year: number
  bucketIndex: number
  startWeek: number
  endWeek: number
  values: number[]
}

export function buildSeasonalMetricBuckets(
  rides: readonly Ride[],
  metricKey: MetricKey,
): SeasonalMetricBucket[] {
  const bucketsByKey = new Map<string, SeasonalBucketAccumulator>()

  for (const ride of rides) {
    if (!isValidWeekOfYear(ride.weekOfYear)) {
      continue
    }

    const value = getRideMetric(ride, metricKey)

    if (value === undefined || !Number.isFinite(value)) {
      continue
    }

    const bucketRange = getBiweeklyBucketRange(ride.weekOfYear)
    const bucketKey = `${ride.year}:${bucketRange.bucketIndex}`
    const existingBucket = bucketsByKey.get(bucketKey)

    if (existingBucket) {
      existingBucket.values.push(value)
      continue
    }

    bucketsByKey.set(bucketKey, {
      year: ride.year,
      ...bucketRange,
      values: [value],
    })
  }

  return Array.from(bucketsByKey.values())
    .map((bucket) => {
      const sampleCount = bucket.values.length

      return {
        year: bucket.year,
        bucketIndex: bucket.bucketIndex,
        startWeek: bucket.startWeek,
        endWeek: bucket.endWeek,
        value: median(bucket.values),
        sampleCount,
        sparse: sampleCount < 2,
      }
    })
    .sort((a, b) => a.year - b.year || a.bucketIndex - b.bucketIndex)
}

function isValidWeekOfYear(weekOfYear: number): boolean {
  return Number.isInteger(weekOfYear) && weekOfYear >= 1 && weekOfYear <= 53
}

function getBiweeklyBucketRange(weekOfYear: number): {
  bucketIndex: number
  startWeek: number
  endWeek: number
} {
  const bucketIndex = Math.floor((weekOfYear - 1) / 2) + 1
  const startWeek = (bucketIndex - 1) * 2 + 1

  return {
    bucketIndex,
    startWeek,
    endWeek: Math.min(startWeek + 1, 53),
  }
}

function median(values: readonly number[]): number {
  const sortedValues = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex]
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
}
