import { describe, expect, it } from 'vitest'
import {
  normalizeStravaActivities,
  normalizeStravaActivity,
} from './normalizeActivity.js'
import type { StravaSummaryActivity } from './activities.js'

describe('Strava activity normalization', () => {
  it('converts Strava units into the Ride model without rounding', () => {
    const ride = normalizeStravaActivity(
      createActivity({
        distance: 16093.4,
        moving_time: 3661,
        elapsed_time: 3901,
        total_elevation_gain: 304.8,
        average_speed: 4.4704,
      }),
    )

    expect(ride.distanceMiles).toBeCloseTo(9.9999978314)
    expect(ride.movingTimeMinutes).toBeCloseTo(61.0166666667)
    expect(ride.elapsedTimeMinutes).toBeCloseTo(65.0166666667)
    expect(ride.elevationGainFeet).toBeCloseTo(1000.000032)
    expect(ride.averageSpeedMph).toBeCloseTo(10.000027776)
  })

  it('maps identity, sport, flags, and omits live temperature', () => {
    const ride = normalizeStravaActivity(
      createActivity({
        id: 123456789,
        sport_type: 'GravelRide',
        trainer: true,
        commute: true,
        manual: true,
      }),
    )

    expect(ride).toMatchObject({
      id: '123456789',
      sportType: 'GravelRide',
      trainer: true,
      commute: true,
      manual: true,
    })
    expect(ride.temperatureF).toBeUndefined()
  })

  it('derives local date fields from start_date_local local-clock components', () => {
    const ride = normalizeStravaActivity(
      createActivity({
        start_date: '2026-01-02T06:30:00Z',
        start_date_local: '2026-01-01T23:30:00Z',
      }),
    )

    expect(ride.startTime).toBe('2026-01-01T23:30:00Z')
    expect(ride.localDate).toBe('2026-01-01')
    expect(ride.year).toBe(2026)
    expect(ride.month).toBe(1)
    expect(ride.dayOfWeek).toBe('thursday')
    expect(ride.isWeekend).toBe(false)
  })

  it('does not shift UTC-looking start_date_local values by host timezone', () => {
    const ride = normalizeStravaActivity(
      createActivity({
        start_date_local: '2026-03-08T00:30:00Z',
      }),
    )

    expect(ride.localDate).toBe('2026-03-08')
    expect(ride.dayOfWeek).toBe('sunday')
    expect(ride.isWeekend).toBe(true)
  })

  it('uses ISO week numbers around year boundaries', () => {
    expect(
      normalizeStravaActivity(
        createActivity({ start_date_local: '2024-12-30T08:00:00Z' }),
      ).weekOfYear,
    ).toBe(1)
    expect(
      normalizeStravaActivity(
        createActivity({ start_date_local: '2025-01-01T08:00:00Z' }),
      ).weekOfYear,
    ).toBe(1)
    expect(
      normalizeStravaActivity(
        createActivity({ start_date_local: '2025-01-05T08:00:00Z' }),
      ).weekOfYear,
    ).toBe(1)
    expect(
      normalizeStravaActivity(
        createActivity({ start_date_local: '2025-01-06T08:00:00Z' }),
      ).weekOfYear,
    ).toBe(2)
  })

  it('deduplicates by Strava activity id and preserves first occurrence', () => {
    const result = normalizeStravaActivities([
      createActivity({ id: 1, sport_type: 'Ride' }),
      createActivity({ id: 2, sport_type: 'VirtualRide' }),
      createActivity({ id: 1, sport_type: 'GravelRide' }),
    ])

    expect(result.deduplicated).toBe(1)
    expect(result.rides.map((ride) => ride.id)).toEqual(['1', '2'])
    expect(result.rides[0]?.sportType).toBe('Ride')
  })

  it('does not expose raw Strava field names after normalization', () => {
    const ride = normalizeStravaActivity(createActivity())
    const serialized = JSON.stringify(ride)

    expect(serialized).not.toContain('sport_type')
    expect(serialized).not.toContain('start_date_local')
    expect(serialized).not.toContain('moving_time')
    expect(serialized).not.toContain('elapsed_time')
    expect(serialized).not.toContain('total_elevation_gain')
    expect(serialized).not.toContain('average_speed')
  })
})

function createActivity(
  overrides: Partial<StravaSummaryActivity> = {},
): StravaSummaryActivity {
  return {
    id: 1,
    sport_type: 'Ride',
    start_date: '2026-01-01T15:00:00Z',
    start_date_local: '2026-01-01T08:00:00Z',
    distance: 16093.4,
    moving_time: 3600,
    elapsed_time: 3900,
    total_elevation_gain: 300,
    average_speed: 4.47,
    trainer: false,
    commute: false,
    manual: false,
    ...overrides,
  }
}

