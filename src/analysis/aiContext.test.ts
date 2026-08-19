import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import {
  buildDatasetProfile,
  summarizeSelection,
  type SelectionMetricSummary,
} from './aiContext.ts'

describe('buildDatasetProfile', () => {
  it('returns a compact empty profile for no source rides', () => {
    expect(buildDatasetProfile([])).toEqual({
      rideCount: 0,
      years: [],
      sportTypes: [],
      metrics: expectedMetricKeys.map((metric) =>
        expect.objectContaining({
          metric,
          finiteCount: 0,
          missingCount: 0,
          available: false,
        }),
      ),
    })
  })

  it('returns source-level date range, sorted years, and sorted sport types', () => {
    const profile = buildDatasetProfile([
      createRide({
        id: 'late',
        localDate: '2026-05-01',
        year: 2026,
        sportType: 'VirtualRide',
      }),
      createRide({
        id: 'early',
        localDate: '2024-01-15',
        year: 2024,
        sportType: 'Ride',
      }),
      createRide({
        id: 'middle',
        localDate: '2025-07-12',
        year: 2025,
        sportType: 'Ride',
      }),
    ])

    expect(profile).toMatchObject({
      rideCount: 3,
      dateRange: { start: '2024-01-15', end: '2026-05-01' },
      years: [2024, 2025, 2026],
      sportTypes: ['Ride', 'VirtualRide'],
    })
  })

  it('reports metric availability for every current metric key', () => {
    const profile = buildDatasetProfile([
      createRide({ id: 'a', temperatureF: undefined }),
      createRide({ id: 'b', temperatureF: 72 }),
    ])

    expect(profile.metrics).toEqual([
      expect.objectContaining({
        metric: 'averageSpeedMph',
        label: 'Average speed',
        unit: 'mph',
        optional: false,
        finiteCount: 2,
        missingCount: 0,
        available: true,
      }),
      expect.objectContaining({
        metric: 'distanceMiles',
        label: 'Distance',
        unit: 'mi',
        optional: false,
        finiteCount: 2,
        missingCount: 0,
        available: true,
      }),
      expect.objectContaining({
        metric: 'elevationGainFeet',
        label: 'Elevation gain',
        unit: 'ft',
        optional: false,
        finiteCount: 2,
        missingCount: 0,
        available: true,
      }),
      expect.objectContaining({
        metric: 'movingTimeMinutes',
        label: 'Moving time',
        unit: 'min',
        optional: false,
        finiteCount: 2,
        missingCount: 0,
        available: true,
      }),
      expect.objectContaining({
        metric: 'elapsedTimeMinutes',
        label: 'Elapsed time',
        unit: 'min',
        optional: false,
        finiteCount: 2,
        missingCount: 0,
        available: true,
      }),
      expect.objectContaining({
        metric: 'temperatureF',
        label: 'Temperature',
        unit: '°F',
        optional: true,
        finiteCount: 1,
        missingCount: 1,
        available: true,
      }),
    ])
  })

  it('marks optional temperature unavailable when no source rides have finite values', () => {
    const profile = buildDatasetProfile([
      createRide({ id: 'missing', temperatureF: undefined }),
      createRide({ id: 'nan', temperatureF: Number.NaN }),
      createRide({ id: 'infinite', temperatureF: Number.POSITIVE_INFINITY }),
      createRide({ id: 'negative-infinite', temperatureF: Number.NEGATIVE_INFINITY }),
    ])

    expect(getProfileMetric(profile, 'temperatureF')).toMatchObject({
      optional: true,
      finiteCount: 0,
      missingCount: 4,
      available: false,
    })
  })

  it('does not mutate or reorder source rides', () => {
    const rides = [
      createRide({ id: 'b', localDate: '2026-01-01', year: 2026 }),
      createRide({ id: 'a', localDate: '2025-01-01', year: 2025 }),
    ]
    const originalRides = rides.map((ride) => ({ ...ride }))
    const originalIds = rides.map((ride) => ride.id)

    buildDatasetProfile(rides)

    expect(rides).toEqual(originalRides)
    expect(rides.map((ride) => ride.id)).toEqual(originalIds)
  })
})

describe('summarizeSelection', () => {
  it('returns an empty summary without per-metric missing warnings', () => {
    const summary = summarizeSelection([])

    expect(summary).toEqual({
      rideCount: 0,
      metrics: expectedMetricKeys.map((metric) =>
        expect.objectContaining({
          metric,
          finiteCount: 0,
          missingCount: 0,
        }),
      ),
      warnings: [{ code: 'empty-selection' }],
    })
    expect(summary.dateRange).toBeUndefined()
  })

  it('summarizes every current metric using finite raw values only', () => {
    const summary = summarizeSelection([
      createRide({
        id: 'a',
        localDate: '2025-01-03',
        averageSpeedMph: 10.25,
        distanceMiles: 10.125,
        elevationGainFeet: 100,
        movingTimeMinutes: 30,
        elapsedTimeMinutes: 35,
        temperatureF: 60,
      }),
      createRide({
        id: 'b',
        localDate: '2025-01-01',
        averageSpeedMph: 20.75,
        distanceMiles: 20.375,
        elevationGainFeet: 200,
        movingTimeMinutes: 60,
        elapsedTimeMinutes: 75,
        temperatureF: 70,
      }),
      createRide({
        id: 'c',
        localDate: '2025-01-02',
        averageSpeedMph: 30.5,
        distanceMiles: 30.5,
        elevationGainFeet: 300,
        movingTimeMinutes: 90,
        elapsedTimeMinutes: 105,
        temperatureF: 80,
      }),
    ])

    expect(summary.rideCount).toBe(3)
    expect(summary.dateRange).toEqual({
      start: '2025-01-01',
      end: '2025-01-03',
    })
    expect(getSummaryMetric(summary, 'averageSpeedMph')).toMatchObject({
      finiteCount: 3,
      missingCount: 0,
      mean: 20.5,
      median: 20.75,
      min: 10.25,
      max: 30.5,
    })
    expect(getSummaryMetric(summary, 'averageSpeedMph').total).toBeUndefined()
    expect(getSummaryMetric(summary, 'distanceMiles')).toMatchObject({
      finiteCount: 3,
      missingCount: 0,
      mean: 20.333333333333332,
      median: 20.375,
      min: 10.125,
      max: 30.5,
      total: 61,
    })
    expect(getSummaryMetric(summary, 'elevationGainFeet')).toMatchObject({
      mean: 200,
      median: 200,
      min: 100,
      max: 300,
      total: 600,
    })
    expect(getSummaryMetric(summary, 'movingTimeMinutes')).toMatchObject({
      total: 180,
    })
    expect(getSummaryMetric(summary, 'elapsedTimeMinutes')).toMatchObject({
      total: 215,
    })
    expect(getSummaryMetric(summary, 'temperatureF')).toMatchObject({
      mean: 70,
      median: 70,
      min: 60,
      max: 80,
    })
    expect(getSummaryMetric(summary, 'temperatureF').total).toBeUndefined()
    expect(summary.warnings).toEqual([])
  })

  it('uses the middle average for even-count medians', () => {
    const summary = summarizeSelection([
      createRide({ id: 'a', averageSpeedMph: 10 }),
      createRide({ id: 'b', averageSpeedMph: 20 }),
      createRide({ id: 'c', averageSpeedMph: 30 }),
      createRide({ id: 'd', averageSpeedMph: 100 }),
    ])

    expect(getSummaryMetric(summary, 'averageSpeedMph').median).toBe(25)
  })

  it('treats undefined, NaN, Infinity, and -Infinity as missing metric values', () => {
    const summary = summarizeSelection([
      createRide({ id: 'valid', temperatureF: 60 }),
      createRide({ id: 'missing', temperatureF: undefined }),
      createRide({ id: 'nan', temperatureF: Number.NaN }),
      createRide({ id: 'infinite', temperatureF: Number.POSITIVE_INFINITY }),
      createRide({ id: 'negative-infinite', temperatureF: Number.NEGATIVE_INFINITY }),
    ])

    expect(getSummaryMetric(summary, 'temperatureF')).toMatchObject({
      finiteCount: 1,
      missingCount: 4,
      mean: 60,
      median: 60,
      min: 60,
      max: 60,
    })
    expect(summary.warnings).toContainEqual({
      code: 'metric-has-missing-values',
      metric: 'temperatureF',
      missingCount: 4,
    })
  })

  it('warns for sparse non-empty selections', () => {
    expect(summarizeSelection([createRide()]).warnings).toContainEqual({
      code: 'sparse-selection',
      rideCount: 1,
    })
    expect(summarizeSelection([createRide({ id: 'a' }), createRide({ id: 'b' })]).warnings).toContainEqual({
      code: 'sparse-selection',
      rideCount: 2,
    })
    expect(
      summarizeSelection([
        createRide({ id: 'a' }),
        createRide({ id: 'b' }),
        createRide({ id: 'c' }),
      ]).warnings,
    ).not.toContainEqual({ code: 'sparse-selection', rideCount: 3 })
  })

  it('warns when a non-empty selection has no finite values for a metric', () => {
    const summary = summarizeSelection([
      createRide({ id: 'missing', temperatureF: undefined }),
      createRide({ id: 'nan', temperatureF: Number.NaN }),
      createRide({ id: 'infinite', temperatureF: Number.POSITIVE_INFINITY }),
    ])

    expect(getSummaryMetric(summary, 'temperatureF')).toMatchObject({
      finiteCount: 0,
      missingCount: 3,
    })
    expect(getSummaryMetric(summary, 'temperatureF').mean).toBeUndefined()
    expect(summary.warnings).toContainEqual({
      code: 'metric-has-no-finite-values',
      metric: 'temperatureF',
    })
    expect(summary.warnings).toContainEqual({
      code: 'metric-has-missing-values',
      metric: 'temperatureF',
      missingCount: 3,
    })
  })

  it('does not total average speed or temperature', () => {
    const summary = summarizeSelection([
      createRide({ id: 'a', averageSpeedMph: 10, temperatureF: 60 }),
      createRide({ id: 'b', averageSpeedMph: 20, temperatureF: 70 }),
    ])

    expect(getSummaryMetric(summary, 'averageSpeedMph').total).toBeUndefined()
    expect(getSummaryMetric(summary, 'temperatureF').total).toBeUndefined()
  })

  it('does not mutate or reorder selected rides', () => {
    const rides = [
      createRide({ id: 'b', localDate: '2026-01-01', year: 2026 }),
      createRide({ id: 'a', localDate: '2025-01-01', year: 2025 }),
    ]
    const originalRides = rides.map((ride) => ({ ...ride }))
    const originalIds = rides.map((ride) => ride.id)

    summarizeSelection(rides)

    expect(rides).toEqual(originalRides)
    expect(rides.map((ride) => ride.id)).toEqual(originalIds)
  })
})

const expectedMetricKeys = [
  'averageSpeedMph',
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
  'elapsedTimeMinutes',
  'temperatureF',
] as const satisfies readonly MetricKey[]

function getProfileMetric(
  profile: ReturnType<typeof buildDatasetProfile>,
  metric: MetricKey,
) {
  const result = profile.metrics.find((summary) => summary.metric === metric)

  expect(result).toBeDefined()

  return result
}

function getSummaryMetric(
  summary: ReturnType<typeof summarizeSelection>,
  metric: MetricKey,
): SelectionMetricSummary {
  const result = summary.metrics.find((metricSummary) => metricSummary.metric === metric)

  expect(result).toBeDefined()

  return result as SelectionMetricSummary
}

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'id'
      | 'startTime'
      | 'localDate'
      | 'year'
      | 'month'
      | 'weekOfYear'
      | 'dayOfWeek'
      | 'isWeekend'
      | 'distanceMiles'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'averageSpeedMph'
      | 'elevationGainFeet'
      | 'temperatureF'
      | 'sportType'
      | 'trainer'
      | 'commute'
      | 'manual'
    >
  > = {},
): Ride {
  const localDate = overrides.localDate ?? '2025-01-01'

  return {
    id: overrides.id ?? 'ride-a',
    startTime: overrides.startTime ?? `${localDate}T07:00:00-07:00`,
    localDate,
    year: overrides.year ?? Number(localDate.slice(0, 4)),
    month: overrides.month ?? Number(localDate.slice(5, 7)),
    weekOfYear: overrides.weekOfYear ?? 1,
    dayOfWeek: overrides.dayOfWeek ?? ('wednesday' satisfies DayOfWeek),
    isWeekend: overrides.isWeekend ?? false,
    distanceMiles: overrides.distanceMiles ?? 31.4,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 125,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 141,
    averageSpeedMph: overrides.averageSpeedMph ?? 15.4,
    elevationGainFeet: overrides.elevationGainFeet ?? 1250,
    temperatureF: overrides.temperatureF,
    sportType: overrides.sportType ?? 'Ride',
    trainer: overrides.trainer ?? false,
    commute: overrides.commute ?? false,
    manual: overrides.manual ?? false,
  }
}
