import type { SeasonalMetricBucket } from '../analysis/seasonalMetrics.ts'

export type SeasonalLineSegmentPoint = SeasonalMetricBucket & {
  segmentId: string
}

export function getSeasonalLineSegmentPoints(
  buckets: readonly SeasonalMetricBucket[],
): SeasonalLineSegmentPoint[] {
  const bucketsByYear = new Map<number, SeasonalMetricBucket[]>()

  for (const bucket of buckets) {
    const yearBuckets = bucketsByYear.get(bucket.year)

    if (yearBuckets) {
      yearBuckets.push(bucket)
    } else {
      bucketsByYear.set(bucket.year, [bucket])
    }
  }

  const segmentPoints: SeasonalLineSegmentPoint[] = []

  for (const [year, yearBuckets] of bucketsByYear) {
    const sortedBuckets = [...yearBuckets].sort(
      (a, b) => a.bucketIndex - b.bucketIndex,
    )

    for (let index = 0; index < sortedBuckets.length - 1; index += 1) {
      const current = sortedBuckets[index]
      const next = sortedBuckets[index + 1]

      if (
        current.sparse ||
        next.sparse ||
        next.bucketIndex !== current.bucketIndex + 1
      ) {
        continue
      }

      const segmentId = `${year}:${current.bucketIndex}-${next.bucketIndex}`
      segmentPoints.push(
        {
          ...current,
          segmentId,
        },
        {
          ...next,
          segmentId,
        },
      )
    }
  }

  return segmentPoints
}
