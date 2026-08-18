import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getMetricDisplay, getRideMetric } from './rideMetrics.ts'

describe('getRideMetric', () => {
  it('returns values for every current metric key', () => {
    const ride = createRide({
      averageSpeedMph: 15.4,
      distanceMiles: 32.1,
      elevationGainFeet: 1840,
      movingTimeMinutes: 125,
      elapsedTimeMinutes: 141,
      temperatureF: 72,
    })

    expect(getRideMetric(ride, 'averageSpeedMph')).toBe(15.4)
    expect(getRideMetric(ride, 'distanceMiles')).toBe(32.1)
    expect(getRideMetric(ride, 'elevationGainFeet')).toBe(1840)
    expect(getRideMetric(ride, 'movingTimeMinutes')).toBe(125)
    expect(getRideMetric(ride, 'elapsedTimeMinutes')).toBe(141)
    expect(getRideMetric(ride, 'temperatureF')).toBe(72)
  })

  it('returns undefined for missing temperature', () => {
    expect(getRideMetric(createRide({ temperatureF: undefined }), 'temperatureF')).toBeUndefined()
  })

  it('does not normalize NaN or non-finite values', () => {
    const ride = createRide({
      averageSpeedMph: Number.NaN,
      distanceMiles: Number.POSITIVE_INFINITY,
      elevationGainFeet: Number.NEGATIVE_INFINITY,
    })

    expect(getRideMetric(ride, 'averageSpeedMph')).toBeNaN()
    expect(getRideMetric(ride, 'distanceMiles')).toBe(Number.POSITIVE_INFINITY)
    expect(getRideMetric(ride, 'elevationGainFeet')).toBe(Number.NEGATIVE_INFINITY)
  })
})

describe('getMetricDisplay', () => {
  it('returns minimal labels and units for every current metric key', () => {
    const expectedDisplays = new Map<MetricKey, { label: string; unit: string }>([
      ['averageSpeedMph', { label: 'Average speed', unit: 'mph' }],
      ['distanceMiles', { label: 'Distance', unit: 'mi' }],
      ['elevationGainFeet', { label: 'Elevation gain', unit: 'ft' }],
      ['movingTimeMinutes', { label: 'Moving time', unit: 'min' }],
      ['elapsedTimeMinutes', { label: 'Elapsed time', unit: 'min' }],
      ['temperatureF', { label: 'Temperature', unit: 'F' }],
    ])

    for (const [metricKey, display] of expectedDisplays) {
      expect(getMetricDisplay(metricKey)).toEqual(display)
    }
  })
})

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
    >
  > = {},
): Ride {
  return {
    id: 'ride-a',
    startTime: '2025-01-01T07:00:00-07:00',
    localDate: '2025-01-01',
    year: 2025,
    month: 1,
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
