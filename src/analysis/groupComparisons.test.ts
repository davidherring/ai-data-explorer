import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import {
  buildGroupedComparison,
  type GroupedComparison,
} from './groupComparisons.ts'

describe('buildGroupedComparison', () => {
  it('groups selected rides by year with deterministic numeric sorting', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'b', localDate: '2026-01-01' }),
        createRide({ id: 'a', localDate: '2024-01-01' }),
        createRide({ id: 'c', localDate: '2025-01-01' }),
      ],
      { groupBy: 'year' },
    )

    expect(comparison.groupBy).toBe('year')
    expect(comparison.sampleCount).toBe(3)
    expect(comparison.groups.map((group) => group.groupValue)).toEqual([
      2024,
      2025,
      2026,
    ])
    expect(comparison.pairwiseDeltas).toBeUndefined()
  })

  it('groups selected rides by month with deterministic numeric sorting', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'march', localDate: '2025-03-01' }),
        createRide({ id: 'january', localDate: '2025-01-01' }),
        createRide({ id: 'february', localDate: '2025-02-01' }),
      ],
      { groupBy: 'month' },
    )

    expect(comparison.groups.map((group) => group.groupValue)).toEqual([1, 2, 3])
  })

  it('groups selected rides by day of week in calendar order', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'sunday', dayOfWeek: 'sunday' }),
        createRide({ id: 'monday', dayOfWeek: 'monday' }),
        createRide({ id: 'wednesday', dayOfWeek: 'wednesday' }),
      ],
      { groupBy: 'dayOfWeek' },
    )

    expect(comparison.groups.map((group) => group.groupValue)).toEqual([
      'monday',
      'wednesday',
      'sunday',
    ])
  })

  it('groups selected rides by day mode with weekdays before weekends', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'weekend', isWeekend: true }),
        createRide({ id: 'weekday', isWeekend: false }),
      ],
      { groupBy: 'dayMode' },
    )

    expect(comparison.groups.map((group) => group.groupValue)).toEqual([
      'weekday',
      'weekend',
    ])
  })

  it('preserves explicit requested group order and omits unrequested groups', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: '2019', localDate: '2019-01-01' }),
        createRide({ id: '2020', localDate: '2020-01-01' }),
        createRide({ id: '2026', localDate: '2026-01-01' }),
      ],
      { groupBy: 'year', groups: [2026, 2019] },
    )

    expect(comparison.groups.map((group) => group.groupValue)).toEqual([
      2026,
      2019,
    ])
    expect(comparison.groups.map((group) => group.rideCount)).toEqual([1, 1])
  })

  it('deduplicates requested groups while preserving first occurrence order', () => {
    const comparison = buildGroupedComparison(
      [createRide({ id: '2026', localDate: '2026-01-01' })],
      { groupBy: 'year', groups: [2026, 2026] },
    )

    expect(comparison.groups.map((group) => group.groupValue)).toEqual([2026])
  })

  it('represents missing requested groups explicitly', () => {
    const comparison = buildGroupedComparison(
      [createRide({ id: '2026', localDate: '2026-01-01' })],
      { groupBy: 'year', groups: [2019, 2026] },
    )

    expect(comparison.groups[0]).toMatchObject({
      groupValue: 2019,
      status: 'missing-requested-group',
      rideCount: 0,
      warnings: [
        { code: 'missing-requested-group', groupValue: 2019 },
        { code: 'empty-selection' },
      ],
      composition: { sportTypes: [] },
    })
    expect(comparison.groups[0].dateRange).toBeUndefined()
    expect(comparison.groups[1]).toMatchObject({
      groupValue: 2026,
      status: 'present',
      rideCount: 1,
    })
  })

  it('summarizes each group with finite metric values and additive totals only', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({
          id: '2019-a',
          localDate: '2019-01-01',
          averageSpeedMph: 12,
          distanceMiles: 10.125,
          elevationGainFeet: 100,
          movingTimeMinutes: 30,
          elapsedTimeMinutes: 40,
          temperatureF: 60,
        }),
        createRide({
          id: '2019-b',
          localDate: '2019-01-02',
          averageSpeedMph: 16,
          distanceMiles: 20.375,
          elevationGainFeet: 300,
          movingTimeMinutes: 60,
          elapsedTimeMinutes: 80,
          temperatureF: Number.NaN,
        }),
        createRide({
          id: '2019-c',
          localDate: '2019-01-03',
          averageSpeedMph: 20,
          distanceMiles: 30.5,
          elevationGainFeet: 500,
          movingTimeMinutes: 90,
          elapsedTimeMinutes: 120,
          temperatureF: undefined,
        }),
      ],
      { groupBy: 'year' },
    )

    const group = comparison.groups[0]

    expect(group.dateRange).toEqual({ start: '2019-01-01', end: '2019-01-03' })
    expect(getMetric(group, 'averageSpeedMph')).toMatchObject({
      finiteCount: 3,
      missingCount: 0,
      mean: 16,
      median: 16,
      min: 12,
      max: 20,
    })
    expect(getMetric(group, 'averageSpeedMph').total).toBeUndefined()
    expect(getMetric(group, 'distanceMiles')).toMatchObject({
      finiteCount: 3,
      missingCount: 0,
      total: 61,
    })
    expect(getMetric(group, 'elevationGainFeet')).toMatchObject({ total: 900 })
    expect(getMetric(group, 'movingTimeMinutes')).toMatchObject({ total: 180 })
    expect(getMetric(group, 'elapsedTimeMinutes')).toMatchObject({ total: 240 })
    expect(getMetric(group, 'temperatureF')).toMatchObject({
      finiteCount: 1,
      missingCount: 2,
      mean: 60,
      median: 60,
    })
    expect(getMetric(group, 'temperatureF').total).toBeUndefined()
    expect(group.warnings).toContainEqual({
      code: 'metric-has-missing-values',
      metric: 'temperatureF',
      missingCount: 2,
    })
  })

  it('keeps sparse group warnings from the reused selection summary', () => {
    const comparison = buildGroupedComparison(
      [createRide({ id: 'single', localDate: '2026-01-01' })],
      { groupBy: 'year' },
    )

    expect(comparison.groups[0].warnings).toContainEqual({
      code: 'sparse-selection',
      rideCount: 1,
    })
  })

  it('reports no finite metric values for a non-empty group', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'a', temperatureF: undefined }),
        createRide({ id: 'b', temperatureF: Number.POSITIVE_INFINITY }),
        createRide({ id: 'c', temperatureF: Number.NEGATIVE_INFINITY }),
      ],
      { groupBy: 'year' },
    )

    expect(getMetric(comparison.groups[0], 'temperatureF')).toMatchObject({
      finiteCount: 0,
      missingCount: 3,
    })
    expect(comparison.groups[0].warnings).toContainEqual({
      code: 'metric-has-no-finite-values',
      metric: 'temperatureF',
    })
  })

  it('includes compact sport type composition counts sorted by sport type', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'ride-a', sportType: 'Ride' }),
        createRide({ id: 'gravel', sportType: 'GravelRide' }),
        createRide({ id: 'ride-b', sportType: 'Ride' }),
      ],
      { groupBy: 'year' },
    )

    expect(comparison.groups[0].composition.sportTypes).toEqual([
      { value: 'GravelRide', count: 1 },
      { value: 'Ride', count: 2 },
    ])
  })

  it('emits pairwise deltas only when exactly two groups are present', () => {
    const twoGroupComparison = buildGroupedComparison(
      [
        createRide({
          id: 'baseline-a',
          localDate: '2019-01-01',
          averageSpeedMph: 10,
          distanceMiles: 10,
        }),
        createRide({
          id: 'baseline-b',
          localDate: '2019-01-02',
          averageSpeedMph: 20,
          distanceMiles: 20,
        }),
        createRide({
          id: 'comparison-a',
          localDate: '2026-01-01',
          averageSpeedMph: 12,
          distanceMiles: 40,
        }),
        createRide({
          id: 'comparison-b',
          localDate: '2026-01-02',
          averageSpeedMph: 22,
          distanceMiles: 60,
        }),
      ],
      { groupBy: 'year', groups: [2019, 2026] },
    )
    const threeGroupComparison = buildGroupedComparison(
      [
        createRide({ id: '2019', localDate: '2019-01-01' }),
        createRide({ id: '2020', localDate: '2020-01-01' }),
        createRide({ id: '2026', localDate: '2026-01-01' }),
      ],
      { groupBy: 'year' },
    )

    expect(twoGroupComparison.pairwiseDeltas).toMatchObject({
      baselineGroupValue: 2019,
      comparisonGroupValue: 2026,
    })
    expect(
      getDeltaMetric(twoGroupComparison, 'averageSpeedMph').mean,
    ).toMatchObject({
      baselineValue: 15,
      comparisonValue: 17,
      absoluteDifference: 2,
      percentDifference: 2 / 15,
    })
    expect(
      getDeltaMetric(twoGroupComparison, 'averageSpeedMph').total,
    ).toBeUndefined()
    expect(getDeltaMetric(twoGroupComparison, 'distanceMiles').total).toMatchObject({
      baselineValue: 30,
      comparisonValue: 100,
      absoluteDifference: 70,
      percentDifference: 70 / 30,
    })
    expect(threeGroupComparison.pairwiseDeltas).toBeUndefined()
  })

  it('omits percent deltas when the baseline value is zero', () => {
    const comparison = buildGroupedComparison(
      [
        createRide({ id: 'baseline', localDate: '2019-01-01', distanceMiles: 0 }),
        createRide({ id: 'comparison', localDate: '2026-01-01', distanceMiles: 10 }),
      ],
      { groupBy: 'year', groups: [2019, 2026] },
    )

    expect(getDeltaMetric(comparison, 'distanceMiles').mean).toEqual({
      baselineValue: 0,
      comparisonValue: 10,
      absoluteDifference: 10,
    })
  })

  it('does not mutate source data or reorder input rides', () => {
    const rides = [
      createRide({ id: 'b', localDate: '2026-01-01' }),
      createRide({ id: 'a', localDate: '2019-01-01' }),
    ]
    const originalRides = rides.map((ride) => ({ ...ride }))
    const originalIds = rides.map((ride) => ride.id)

    buildGroupedComparison(rides, { groupBy: 'year', groups: [2019, 2026] })

    expect(rides).toEqual(originalRides)
    expect(rides.map((ride) => ride.id)).toEqual(originalIds)
  })
})

function getMetric(
  group: GroupedComparison['groups'][number],
  metric: GroupedComparison['groups'][number]['metrics'][number]['metric'],
) {
  const result = group.metrics.find((summary) => summary.metric === metric)

  expect(result).toBeDefined()

  return result!
}

function getDeltaMetric(
  comparison: GroupedComparison,
  metric: GroupedComparison['groups'][number]['metrics'][number]['metric'],
) {
  const result = comparison.pairwiseDeltas?.metrics.find(
    (summary) => summary.metric === metric,
  )

  expect(result).toBeDefined()

  return result!
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
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 65,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    temperatureF: overrides.temperatureF,
    sportType: overrides.sportType ?? 'Ride',
    trainer: overrides.trainer ?? false,
    commute: overrides.commute ?? false,
    manual: overrides.manual ?? false,
  }
}
