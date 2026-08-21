import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import { calculateMetricTrend } from './metricTrends.ts'

describe('calculateMetricTrend', () => {
  it('returns empty-selection for empty input', () => {
    expect(calculateMetricTrend([], 'averageSpeedMph')).toEqual({
      metric: 'averageSpeedMph',
      label: 'Average speed',
      unit: 'mph',
      sampleCount: 0,
      validPointCount: 0,
      missingCount: 0,
      direction: 'unavailable',
      status: 'empty-selection',
      warnings: [{ code: 'empty-selection' }],
    })
  })

  it('requires at least 3 finite metric points', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 12 }),
        createActivity({ id: 'b', localDate: '2025-01-02', averageSpeedMph: 14 }),
      ],
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 2,
      validPointCount: 2,
      missingCount: 0,
      dateRange: { start: '2025-01-01', end: '2025-01-02' },
      timeSpanDays: 1,
      metricMin: 12,
      metricMax: 14,
      direction: 'unavailable',
      status: 'insufficient-valid-points',
      warnings: [{ code: 'insufficient-valid-points', validPointCount: 2 }],
    })
    expect(result.slopePerDay).toBeUndefined()
    expect(result.pearsonR).toBeUndefined()
  })

  it('excludes undefined and non-finite metric values and counts them as missing', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'valid-a', localDate: '2025-01-01', temperatureF: 60 }),
        createActivity({ id: 'missing', localDate: '2025-01-02', temperatureF: undefined }),
        createActivity({ id: 'nan', localDate: '2025-01-03', temperatureF: Number.NaN }),
        createActivity({
          id: 'infinite',
          localDate: '2025-01-04',
          temperatureF: Number.POSITIVE_INFINITY,
        }),
        createActivity({
          id: 'negative-infinite',
          localDate: '2025-01-05',
          temperatureF: Number.NEGATIVE_INFINITY,
        }),
        createActivity({ id: 'valid-b', localDate: '2025-01-06', temperatureF: 70 }),
        createActivity({ id: 'valid-c', localDate: '2025-01-11', temperatureF: 80 }),
      ],
      'temperatureF',
    )

    expect(result).toMatchObject({
      metric: 'temperatureF',
      label: 'Temperature',
      unit: '°F',
      sampleCount: 7,
      validPointCount: 3,
      missingCount: 4,
      metricMin: 60,
      metricMax: 80,
      status: 'ready',
    })
    expect(result.warnings).toContainEqual({
      code: 'metric-has-missing-values',
      metric: 'temperatureF',
      missingCount: 4,
    })
  })

  it('returns metric-has-no-finite-values when the selected metric is entirely missing', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'missing', temperatureF: undefined }),
        createActivity({ id: 'nan', temperatureF: Number.NaN }),
      ],
      'temperatureF',
    )

    expect(result).toMatchObject({
      sampleCount: 2,
      validPointCount: 0,
      missingCount: 2,
      status: 'insufficient-valid-points',
    })
    expect(result.warnings).toEqual([
      { code: 'insufficient-valid-points', validPointCount: 0 },
      { code: 'metric-has-no-finite-values', metric: 'temperatureF' },
      {
        code: 'metric-has-missing-values',
        metric: 'temperatureF',
        missingCount: 2,
      },
    ])
  })

  it('returns zero-time-variance when all valid points share a local date', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-04-10', averageSpeedMph: 12 }),
        createActivity({ id: 'b', localDate: '2025-04-10', averageSpeedMph: 14 }),
        createActivity({ id: 'c', localDate: '2025-04-10', averageSpeedMph: 16 }),
      ],
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      dateRange: { start: '2025-04-10', end: '2025-04-10' },
      timeSpanDays: 0,
      metricMin: 12,
      metricMax: 16,
      direction: 'unavailable',
      status: 'zero-time-variance',
      gapSummary: { largestGapDays: 0 },
    })
    expect(result.warnings).toContainEqual({ code: 'zero-time-variance' })
    expect(result.pearsonR).toBeUndefined()
  })

  it('returns zero-metric-variance and flat direction for constant metric values', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 15 }),
        createActivity({ id: 'b', localDate: '2025-01-11', averageSpeedMph: 15 }),
        createActivity({ id: 'c', localDate: '2025-01-21', averageSpeedMph: 15 }),
      ],
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      slopePerDay: 0,
      slopePerYear: 0,
      estimatedChangeOverRange: 0,
      direction: 'flat',
      status: 'zero-metric-variance',
    })
    expect(result.warnings).toContainEqual({
      code: 'zero-metric-variance',
      metric: 'averageSpeedMph',
    })
    expect(result.pearsonR).toBeUndefined()
    expect(result.rSquared).toBeUndefined()
  })

  it('calculates a known increasing trend without rounding', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 10 }),
        createActivity({ id: 'b', localDate: '2025-01-11', averageSpeedMph: 20 }),
        createActivity({ id: 'c', localDate: '2025-01-21', averageSpeedMph: 30 }),
      ],
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      dateRange: { start: '2025-01-01', end: '2025-01-21' },
      timeSpanDays: 20,
      metricMin: 10,
      metricMax: 30,
      slopePerDay: 1,
      slopePerYear: 365.25,
      estimatedChangeOverRange: 20,
      direction: 'increasing',
      status: 'ready',
      gapSummary: { largestGapDays: 10, start: '2025-01-01', end: '2025-01-11' },
      warnings: [],
    })
    expect(result.pearsonR).toBeCloseTo(1)
    expect(result.rSquared).toBeCloseTo(1)
  })

  it('calculates a known decreasing trend', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 30 }),
        createActivity({ id: 'b', localDate: '2025-01-11', averageSpeedMph: 25 }),
        createActivity({ id: 'c', localDate: '2025-01-21', averageSpeedMph: 20 }),
      ],
      'averageSpeedMph',
    )

    expect(result.slopePerDay).toBe(-0.5)
    expect(result.slopePerYear).toBe(-182.625)
    expect(result.estimatedChangeOverRange).toBe(-10)
    expect(result.direction).toBe('decreasing')
    expect(result.status).toBe('ready')
    expect(result.pearsonR).toBeCloseTo(-1)
    expect(result.rSquared).toBeCloseTo(1)
  })

  it('returns raw trend evidence for noisy data without classifying practical significance', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 10 }),
        createActivity({ id: 'b', localDate: '2025-01-11', averageSpeedMph: 20 }),
        createActivity({ id: 'c', localDate: '2025-01-21', averageSpeedMph: 15 }),
        createActivity({ id: 'd', localDate: '2025-01-31', averageSpeedMph: 25 }),
      ],
      'averageSpeedMph',
    )

    expect(result.status).toBe('ready')
    expect(result.direction).toBe('increasing')
    expect(result.slopePerDay).toBeCloseTo(0.4)
    expect(result.estimatedChangeOverRange).toBeCloseTo(12)
    expect(result.pearsonR).toBeGreaterThan(0)
    expect(result.pearsonR).toBeLessThan(1)
    expect(result.rSquared).toBeGreaterThan(0)
    expect(result.rSquared).toBeLessThan(1)
  })

  it('emits a large-date-gap warning when the largest adjacent gap exceeds half the trend span', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', distanceMiles: 10 }),
        createActivity({ id: 'b', localDate: '2025-01-02', distanceMiles: 11 }),
        createActivity({ id: 'c', localDate: '2025-01-30', distanceMiles: 12 }),
      ],
      'distanceMiles',
    )

    expect(result.gapSummary).toEqual({
      largestGapDays: 28,
      start: '2025-01-02',
      end: '2025-01-30',
    })
    expect(result.warnings).toContainEqual({
      code: 'large-date-gap',
      largestGapDays: 28,
      timeSpanDays: 29,
      start: '2025-01-02',
      end: '2025-01-30',
    })
  })

  it('does not emit a large-date-gap warning when the largest gap is exactly half the span', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-01-01', distanceMiles: 10 }),
        createActivity({ id: 'b', localDate: '2025-01-11', distanceMiles: 20 }),
        createActivity({ id: 'c', localDate: '2025-01-21', distanceMiles: 30 }),
      ],
      'distanceMiles',
    )

    expect(result.gapSummary).toEqual({
      largestGapDays: 10,
      start: '2025-01-01',
      end: '2025-01-11',
    })
    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({ code: 'large-date-gap' }),
    )
  })

  it('compares local calendar dates without host-timezone shifts', () => {
    const result = calculateMetricTrend(
      [
        createActivity({ id: 'a', localDate: '2025-12-31', averageSpeedMph: 10 }),
        createActivity({ id: 'b', localDate: '2026-01-01', averageSpeedMph: 11 }),
        createActivity({ id: 'c', localDate: '2026-01-02', averageSpeedMph: 12 }),
      ],
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      dateRange: { start: '2025-12-31', end: '2026-01-02' },
      timeSpanDays: 2,
      slopePerDay: 1,
      estimatedChangeOverRange: 2,
      direction: 'increasing',
    })
  })

  it('sorts copied trend points for date ranges and gaps without mutating input activities', () => {
    const activities = [
      createActivity({ id: 'c', localDate: '2025-01-21', averageSpeedMph: 30 }),
      createActivity({ id: 'a', localDate: '2025-01-01', averageSpeedMph: 10 }),
      createActivity({ id: 'b', localDate: '2025-01-11', averageSpeedMph: 20 }),
    ]
    const originalActivities = activities.map((activity) => ({ ...activity }))
    const originalIds = activities.map((activity) => activity.id)

    const result = calculateMetricTrend(activities, 'averageSpeedMph')

    expect(result.dateRange).toEqual({ start: '2025-01-01', end: '2025-01-21' })
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
