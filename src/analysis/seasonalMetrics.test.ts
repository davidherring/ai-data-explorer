import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import { buildSeasonalMetricBuckets } from './seasonalMetrics.ts'

describe('buildSeasonalMetricBuckets', () => {
  it('returns no buckets for empty input', () => {
    expect(buildSeasonalMetricBuckets([], 'averageSpeedMph')).toEqual([])
  })

  it('returns no buckets when no activities have finite active metric values', () => {
    const activities = [
      createActivity({ id: 'missing-temp', temperatureF: undefined }),
      createActivity({ id: 'nan-temp', temperatureF: Number.NaN }),
      createActivity({ id: 'infinite-temp', temperatureF: Number.POSITIVE_INFINITY }),
      createActivity({ id: 'negative-infinite-temp', temperatureF: Number.NEGATIVE_INFINITY }),
    ]

    expect(buildSeasonalMetricBuckets(activities, 'temperatureF')).toEqual([])
  })

  it('excludes undefined and non-finite active metric values', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'valid-a', weekOfYear: 11, temperatureF: 60 }),
        createActivity({ id: 'missing', weekOfYear: 11, temperatureF: undefined }),
        createActivity({ id: 'nan', weekOfYear: 11, temperatureF: Number.NaN }),
        createActivity({
          id: 'infinite',
          weekOfYear: 11,
          temperatureF: Number.POSITIVE_INFINITY,
        }),
        createActivity({
          id: 'negative-infinite',
          weekOfYear: 11,
          temperatureF: Number.NEGATIVE_INFINITY,
        }),
        createActivity({ id: 'valid-b', weekOfYear: 12, temperatureF: 70 }),
      ],
      'temperatureF',
    )

    expect(buckets).toEqual([
      {
        year: 2025,
        bucketIndex: 6,
        startWeek: 11,
        endWeek: 12,
        value: 65,
        sampleCount: 2,
        sparse: false,
      },
    ])
  })

  it('groups activities by year and biweekly week bucket', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: '2024-a', year: 2024, weekOfYear: 1, averageSpeedMph: 12 }),
        createActivity({ id: '2024-b', year: 2024, weekOfYear: 2, averageSpeedMph: 14 }),
        createActivity({ id: '2025-a', year: 2025, weekOfYear: 1, averageSpeedMph: 16 }),
        createActivity({ id: '2025-b', year: 2025, weekOfYear: 2, averageSpeedMph: 18 }),
        createActivity({ id: '2025-c', year: 2025, weekOfYear: 3, averageSpeedMph: 20 }),
      ],
      'averageSpeedMph',
    )

    expect(buckets).toEqual([
      {
        year: 2024,
        bucketIndex: 1,
        startWeek: 1,
        endWeek: 2,
        value: 13,
        sampleCount: 2,
        sparse: false,
      },
      {
        year: 2025,
        bucketIndex: 1,
        startWeek: 1,
        endWeek: 2,
        value: 17,
        sampleCount: 2,
        sparse: false,
      },
      {
        year: 2025,
        bucketIndex: 2,
        startWeek: 3,
        endWeek: 4,
        value: 20,
        sampleCount: 1,
        sparse: true,
      },
    ])
  })

  it('uses the approved biweekly bucket formula including week 53', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'week-1', weekOfYear: 1, distanceMiles: 10 }),
        createActivity({ id: 'week-2', weekOfYear: 2, distanceMiles: 14 }),
        createActivity({ id: 'week-3', weekOfYear: 3, distanceMiles: 30 }),
        createActivity({ id: 'week-52', weekOfYear: 52, distanceMiles: 520 }),
        createActivity({ id: 'week-53', weekOfYear: 53, distanceMiles: 530 }),
      ],
      'distanceMiles',
    )

    expect(buckets).toEqual([
      {
        year: 2025,
        bucketIndex: 1,
        startWeek: 1,
        endWeek: 2,
        value: 12,
        sampleCount: 2,
        sparse: false,
      },
      {
        year: 2025,
        bucketIndex: 2,
        startWeek: 3,
        endWeek: 4,
        value: 30,
        sampleCount: 1,
        sparse: true,
      },
      {
        year: 2025,
        bucketIndex: 26,
        startWeek: 51,
        endWeek: 52,
        value: 520,
        sampleCount: 1,
        sparse: true,
      },
      {
        year: 2025,
        bucketIndex: 27,
        startWeek: 53,
        endWeek: 53,
        value: 530,
        sampleCount: 1,
        sparse: true,
      },
    ])
  })

  it('skips invalid weekOfYear values outside 1 through 53', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'week-0', weekOfYear: 0, distanceMiles: 999 }),
        createActivity({ id: 'week-54', weekOfYear: 54, distanceMiles: 999 }),
        createActivity({ id: 'fractional-week', weekOfYear: 1.5, distanceMiles: 999 }),
        createActivity({ id: 'valid-week', weekOfYear: 1, distanceMiles: 10 }),
      ],
      'distanceMiles',
    )

    expect(buckets).toEqual([
      {
        year: 2025,
        bucketIndex: 1,
        startWeek: 1,
        endWeek: 2,
        value: 10,
        sampleCount: 1,
        sparse: true,
      },
    ])
  })

  it('calculates the median for odd sample counts', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'a', weekOfYear: 9, elevationGainFeet: 300 }),
        createActivity({ id: 'b', weekOfYear: 9, elevationGainFeet: 100 }),
        createActivity({ id: 'c', weekOfYear: 10, elevationGainFeet: 200 }),
      ],
      'elevationGainFeet',
    )

    expect(buckets[0]).toMatchObject({
      value: 200,
      sampleCount: 3,
      sparse: false,
    })
  })

  it('calculates the median for even sample counts', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'a', weekOfYear: 9, movingTimeMinutes: 10 }),
        createActivity({ id: 'b', weekOfYear: 9, movingTimeMinutes: 20 }),
        createActivity({ id: 'c', weekOfYear: 10, movingTimeMinutes: 30 }),
        createActivity({ id: 'd', weekOfYear: 10, movingTimeMinutes: 40 }),
      ],
      'movingTimeMinutes',
    )

    expect(buckets[0]).toMatchObject({
      value: 25,
      sampleCount: 4,
      sparse: false,
    })
  })

  it('preserves raw numeric precision for median values', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'a', weekOfYear: 15, averageSpeedMph: 15.125 }),
        createActivity({ id: 'b', weekOfYear: 16, averageSpeedMph: 15.375 }),
      ],
      'averageSpeedMph',
    )

    expect(buckets[0].value).toBe(15.25)
  })

  it('omits missing buckets', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: 'bucket-1', weekOfYear: 1, distanceMiles: 10 }),
        createActivity({ id: 'bucket-4', weekOfYear: 7, distanceMiles: 40 }),
      ],
      'distanceMiles',
    )

    expect(buckets.map((bucket) => bucket.bucketIndex)).toEqual([1, 4])
  })

  it('sorts output by year and then bucket index', () => {
    const buckets = buildSeasonalMetricBuckets(
      [
        createActivity({ id: '2025-bucket-3', year: 2025, weekOfYear: 5 }),
        createActivity({ id: '2024-bucket-3', year: 2024, weekOfYear: 5 }),
        createActivity({ id: '2025-bucket-1', year: 2025, weekOfYear: 1 }),
        createActivity({ id: '2024-bucket-1', year: 2024, weekOfYear: 1 }),
      ],
      'averageSpeedMph',
    )

    expect(
      buckets.map((bucket) => `${bucket.year}:${bucket.bucketIndex}`),
    ).toEqual(['2024:1', '2024:3', '2025:1', '2025:3'])
  })

  it('does not mutate source data or reorder input activities', () => {
    const activities = [
      createActivity({ id: 'b', year: 2025, weekOfYear: 5, averageSpeedMph: 16 }),
      createActivity({ id: 'a', year: 2024, weekOfYear: 1, averageSpeedMph: 14 }),
    ]
    const originalActivities = activities.map((activity) => ({ ...activity }))
    const originalIds = activities.map((activity) => activity.id)

    buildSeasonalMetricBuckets(activities, 'averageSpeedMph')

    expect(activities).toEqual(originalActivities)
    expect(activities.map((activity) => activity.id)).toEqual(originalIds)
  })
})

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'id'
      | 'year'
      | 'localDate'
      | 'weekOfYear'
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
    >
  > = {},
): Activity {
  const year = overrides.year ?? 2025
  const localDate = overrides.localDate ?? `${year}-01-01`

  return {
    id: overrides.id ?? 'activity-a',
    startTime: `${localDate}T07:00:00-07:00`,
    localDate,
    year,
    month: Number(localDate.slice(5, 7)),
    weekOfYear: overrides.weekOfYear ?? 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 65,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    temperatureF: overrides.temperatureF,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
