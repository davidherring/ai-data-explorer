import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import { buildCumulativeMetricPoints } from './cumulativeMetrics.ts'

describe('buildCumulativeMetricPoints', () => {
  it('returns no points for empty input', () => {
    expect(buildCumulativeMetricPoints([], 'distanceMiles')).toEqual([])
  })

  it('returns no points when no activities have finite active metric values', () => {
    const activities = [
      createActivity({ id: 'missing-temp', temperatureF: undefined }),
      createActivity({ id: 'nan-temp', temperatureF: Number.NaN }),
      createActivity({ id: 'infinite-temp', temperatureF: Number.POSITIVE_INFINITY }),
      createActivity({ id: 'negative-infinite-temp', temperatureF: Number.NEGATIVE_INFINITY }),
    ]

    expect(buildCumulativeMetricPoints(activities, 'temperatureF')).toEqual([])
  })

  it('excludes undefined and non-finite active metric values', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({ id: 'valid-a', startTime: '2025-01-01T08:00:00Z', temperatureF: 60 }),
        createActivity({ id: 'missing', startTime: '2025-01-02T08:00:00Z', temperatureF: undefined }),
        createActivity({ id: 'nan', startTime: '2025-01-03T08:00:00Z', temperatureF: Number.NaN }),
        createActivity({
          id: 'infinite',
          startTime: '2025-01-04T08:00:00Z',
          temperatureF: Number.POSITIVE_INFINITY,
        }),
        createActivity({
          id: 'negative-infinite',
          startTime: '2025-01-05T08:00:00Z',
          temperatureF: Number.NEGATIVE_INFINITY,
        }),
        createActivity({ id: 'valid-b', startTime: '2025-01-06T08:00:00Z', temperatureF: 70 }),
      ],
      'temperatureF',
    )

    expect(points.map((point) => point.activityId)).toEqual(['valid-a', 'valid-b'])
    expect(points.map((point) => point.value)).toEqual([60, 70])
    expect(points.map((point) => point.cumulativeValue)).toEqual([60, 130])
  })

  it('accumulates distance in athlete-local chronological order', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({
          id: 'third',
          startTime: '2025-01-03T08:00:00Z',
          localDate: '2025-01-03',
          distanceMiles: 30,
        }),
        createActivity({
          id: 'first',
          startTime: '2025-01-01T08:00:00Z',
          localDate: '2025-01-01',
          distanceMiles: 10,
        }),
        createActivity({
          id: 'second',
          startTime: '2025-01-02T08:00:00Z',
          localDate: '2025-01-02',
          distanceMiles: 20,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.activityId)).toEqual(['first', 'second', 'third'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30, 60])
  })

  it('accumulates continuously across year boundaries', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({
          id: 'new-year',
          startTime: '2026-01-01T08:00:00Z',
          localDate: '2026-01-01',
          distanceMiles: 25,
        }),
        createActivity({
          id: 'prior-year',
          startTime: '2025-12-31T08:00:00Z',
          localDate: '2025-12-31',
          distanceMiles: 15,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.activityId)).toEqual(['prior-year', 'new-year'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([15, 40])
  })

  it('orders same-day activities by athlete-local start time', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({
          id: 'late',
          startTime: '2025-05-10T18:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 300,
        }),
        createActivity({
          id: 'early',
          startTime: '2025-05-10T06:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 100,
        }),
        createActivity({
          id: 'midday',
          startTime: '2025-05-10T12:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 200,
        }),
      ],
      'elevationGainFeet',
    )

    expect(points.map((point) => point.activityId)).toEqual(['early', 'midday', 'late'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([100, 300, 600])
  })

  it('compares local-clock timestamp components without timezone shifting', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({
          id: 'later-local',
          startTime: '2026-01-01T00:30:00Z',
          localDate: '2026-01-01',
          distanceMiles: 20,
        }),
        createActivity({
          id: 'earlier-local',
          startTime: '2025-12-31T23:30:00Z',
          localDate: '2025-12-31',
          distanceMiles: 10,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.activityId)).toEqual([
      'earlier-local',
      'later-local',
    ])
  })

  it('orders identical timestamps by activity id', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({ id: 'activity-c', startTime: '2025-01-01T08:00:00Z', distanceMiles: 30 }),
        createActivity({ id: 'activity-a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10 }),
        createActivity({ id: 'activity-b', startTime: '2025-01-01T08:00:00Z', distanceMiles: 20 }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.activityId)).toEqual(['activity-a', 'activity-b', 'activity-c'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30, 60])
  })

  it('falls back to localDate at midnight when startTime is not parseable', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({
          id: 'valid-time',
          startTime: '2025-01-02T08:00:00Z',
          localDate: '2025-01-02',
          distanceMiles: 20,
        }),
        createActivity({
          id: 'fallback-date',
          startTime: 'not-a-local-time',
          localDate: '2025-01-01',
          distanceMiles: 10,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.activityId)).toEqual(['fallback-date', 'valid-time'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30])
  })

  it('returns chart-ready points with local calendar dates and source activity references', () => {
    const activity = createActivity({
      id: 'activity-a',
      startTime: '2025-03-12T08:15:30Z',
      localDate: '2025-03-12',
      distanceMiles: 31.4,
    })
    const [point] = buildCumulativeMetricPoints([activity], 'distanceMiles')

    expect(point).toEqual({
      date: new Date(2025, 2, 12),
      localDate: '2025-03-12',
      activityId: 'activity-a',
      activity,
      value: 31.4,
      cumulativeValue: 31.4,
    })
  })

  it('preserves raw numeric precision while accumulating', () => {
    const points = buildCumulativeMetricPoints(
      [
        createActivity({ id: 'a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10.125 }),
        createActivity({ id: 'b', startTime: '2025-01-02T08:00:00Z', distanceMiles: 20.375 }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.cumulativeValue)).toEqual([10.125, 30.5])
  })

  it('does not mutate source data or reorder input activities', () => {
    const activities = [
      createActivity({ id: 'b', startTime: '2025-01-02T08:00:00Z', distanceMiles: 20 }),
      createActivity({ id: 'a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10 }),
    ]
    const originalActivities = activities.map((activity) => ({ ...activity }))
    const originalIds = activities.map((activity) => activity.id)

    buildCumulativeMetricPoints(activities, 'distanceMiles')

    expect(activities).toEqual(originalActivities)
    expect(activities.map((activity) => activity.id)).toEqual(originalIds)
  })
})

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'id'
      | 'startTime'
      | 'localDate'
      | 'year'
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
    >
  > = {},
): Activity {
  const localDate = overrides.localDate ?? '2025-01-01'

  return {
    id: overrides.id ?? 'activity-a',
    startTime: overrides.startTime ?? `${localDate}T08:00:00Z`,
    localDate,
    year: overrides.year ?? Number(localDate.slice(0, 4)),
    month: Number(localDate.slice(5, 7)),
    weekOfYear: 1,
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
