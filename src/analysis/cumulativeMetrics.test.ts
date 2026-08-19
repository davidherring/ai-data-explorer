import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import { buildCumulativeMetricPoints } from './cumulativeMetrics.ts'

describe('buildCumulativeMetricPoints', () => {
  it('returns no points for empty input', () => {
    expect(buildCumulativeMetricPoints([], 'distanceMiles')).toEqual([])
  })

  it('returns no points when no rides have finite active metric values', () => {
    const rides = [
      createRide({ id: 'missing-temp', temperatureF: undefined }),
      createRide({ id: 'nan-temp', temperatureF: Number.NaN }),
      createRide({ id: 'infinite-temp', temperatureF: Number.POSITIVE_INFINITY }),
      createRide({ id: 'negative-infinite-temp', temperatureF: Number.NEGATIVE_INFINITY }),
    ]

    expect(buildCumulativeMetricPoints(rides, 'temperatureF')).toEqual([])
  })

  it('excludes undefined and non-finite active metric values', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({ id: 'valid-a', startTime: '2025-01-01T08:00:00Z', temperatureF: 60 }),
        createRide({ id: 'missing', startTime: '2025-01-02T08:00:00Z', temperatureF: undefined }),
        createRide({ id: 'nan', startTime: '2025-01-03T08:00:00Z', temperatureF: Number.NaN }),
        createRide({
          id: 'infinite',
          startTime: '2025-01-04T08:00:00Z',
          temperatureF: Number.POSITIVE_INFINITY,
        }),
        createRide({
          id: 'negative-infinite',
          startTime: '2025-01-05T08:00:00Z',
          temperatureF: Number.NEGATIVE_INFINITY,
        }),
        createRide({ id: 'valid-b', startTime: '2025-01-06T08:00:00Z', temperatureF: 70 }),
      ],
      'temperatureF',
    )

    expect(points.map((point) => point.rideId)).toEqual(['valid-a', 'valid-b'])
    expect(points.map((point) => point.value)).toEqual([60, 70])
    expect(points.map((point) => point.cumulativeValue)).toEqual([60, 130])
  })

  it('accumulates distance in athlete-local chronological order', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({
          id: 'third',
          startTime: '2025-01-03T08:00:00Z',
          localDate: '2025-01-03',
          distanceMiles: 30,
        }),
        createRide({
          id: 'first',
          startTime: '2025-01-01T08:00:00Z',
          localDate: '2025-01-01',
          distanceMiles: 10,
        }),
        createRide({
          id: 'second',
          startTime: '2025-01-02T08:00:00Z',
          localDate: '2025-01-02',
          distanceMiles: 20,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.rideId)).toEqual(['first', 'second', 'third'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30, 60])
  })

  it('accumulates continuously across year boundaries', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({
          id: 'new-year',
          startTime: '2026-01-01T08:00:00Z',
          localDate: '2026-01-01',
          distanceMiles: 25,
        }),
        createRide({
          id: 'prior-year',
          startTime: '2025-12-31T08:00:00Z',
          localDate: '2025-12-31',
          distanceMiles: 15,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.rideId)).toEqual(['prior-year', 'new-year'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([15, 40])
  })

  it('orders same-day rides by athlete-local start time', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({
          id: 'late',
          startTime: '2025-05-10T18:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 300,
        }),
        createRide({
          id: 'early',
          startTime: '2025-05-10T06:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 100,
        }),
        createRide({
          id: 'midday',
          startTime: '2025-05-10T12:00:00Z',
          localDate: '2025-05-10',
          elevationGainFeet: 200,
        }),
      ],
      'elevationGainFeet',
    )

    expect(points.map((point) => point.rideId)).toEqual(['early', 'midday', 'late'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([100, 300, 600])
  })

  it('compares local-clock timestamp components without timezone shifting', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({
          id: 'later-local',
          startTime: '2026-01-01T00:30:00Z',
          localDate: '2026-01-01',
          distanceMiles: 20,
        }),
        createRide({
          id: 'earlier-local',
          startTime: '2025-12-31T23:30:00Z',
          localDate: '2025-12-31',
          distanceMiles: 10,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.rideId)).toEqual([
      'earlier-local',
      'later-local',
    ])
  })

  it('orders identical timestamps by ride id', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({ id: 'ride-c', startTime: '2025-01-01T08:00:00Z', distanceMiles: 30 }),
        createRide({ id: 'ride-a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10 }),
        createRide({ id: 'ride-b', startTime: '2025-01-01T08:00:00Z', distanceMiles: 20 }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.rideId)).toEqual(['ride-a', 'ride-b', 'ride-c'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30, 60])
  })

  it('falls back to localDate at midnight when startTime is not parseable', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({
          id: 'valid-time',
          startTime: '2025-01-02T08:00:00Z',
          localDate: '2025-01-02',
          distanceMiles: 20,
        }),
        createRide({
          id: 'fallback-date',
          startTime: 'not-a-local-time',
          localDate: '2025-01-01',
          distanceMiles: 10,
        }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.rideId)).toEqual(['fallback-date', 'valid-time'])
    expect(points.map((point) => point.cumulativeValue)).toEqual([10, 30])
  })

  it('returns chart-ready points with local calendar dates and source ride references', () => {
    const ride = createRide({
      id: 'ride-a',
      startTime: '2025-03-12T08:15:30Z',
      localDate: '2025-03-12',
      distanceMiles: 31.4,
    })
    const [point] = buildCumulativeMetricPoints([ride], 'distanceMiles')

    expect(point).toEqual({
      date: new Date(2025, 2, 12),
      localDate: '2025-03-12',
      rideId: 'ride-a',
      ride,
      value: 31.4,
      cumulativeValue: 31.4,
    })
  })

  it('preserves raw numeric precision while accumulating', () => {
    const points = buildCumulativeMetricPoints(
      [
        createRide({ id: 'a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10.125 }),
        createRide({ id: 'b', startTime: '2025-01-02T08:00:00Z', distanceMiles: 20.375 }),
      ],
      'distanceMiles',
    )

    expect(points.map((point) => point.cumulativeValue)).toEqual([10.125, 30.5])
  })

  it('does not mutate source data or reorder input rides', () => {
    const rides = [
      createRide({ id: 'b', startTime: '2025-01-02T08:00:00Z', distanceMiles: 20 }),
      createRide({ id: 'a', startTime: '2025-01-01T08:00:00Z', distanceMiles: 10 }),
    ]
    const originalRides = rides.map((ride) => ({ ...ride }))
    const originalIds = rides.map((ride) => ride.id)

    buildCumulativeMetricPoints(rides, 'distanceMiles')

    expect(rides).toEqual(originalRides)
    expect(rides.map((ride) => ride.id)).toEqual(originalIds)
  })
})

function createRide(
  overrides: Partial<
    Pick<
      Ride,
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
): Ride {
  const localDate = overrides.localDate ?? '2025-01-01'

  return {
    id: overrides.id ?? 'ride-a',
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
