import { describe, expect, it } from 'vitest'
import {
  normalizeStravaActivities,
  normalizeStravaActivity,
} from './normalizeActivity.js'
import type { StravaSummaryActivity } from './activities.js'

describe('Strava activity normalization', () => {
  it('converts Strava units into the Activity model without rounding', () => {
    const activity = normalizeStravaActivity(
      createActivity({
        distance: 16093.4,
        moving_time: 3661,
        total_elevation_gain: 304.8,
        average_speed: 4.4704,
      }),
    )

    expect(activity.distanceMiles).toBeCloseTo(9.9999978314)
    expect(activity.movingTimeMinutes).toBeCloseTo(61.0166666667)
    expect(activity.elevationGainFeet).toBeCloseTo(1000.000032)
    expect(activity.averageSpeedMph).toBeCloseTo(10.000027776)
  })

  it('maps identity, sport, and flags', () => {
    const activity = normalizeStravaActivity(
      createActivity({
        id: 123456789,
        sport_type: 'GravelRide',
        trainer: true,
        commute: true,
        manual: true,
      }),
    )

    expect(activity).toMatchObject({
      id: '123456789',
      sportType: 'GravelRide',
      trainer: true,
      commute: true,
      manual: true,
    })
  })

  it('preserves supported walk and hike sport types', () => {
    expect(
      normalizeStravaActivity(createActivity({ id: 10, sport_type: 'Walk' }))
        .sportType,
    ).toBe('Walk')
    expect(
      normalizeStravaActivity(createActivity({ id: 11, sport_type: 'Hike' }))
        .sportType,
    ).toBe('Hike')
  })

  it('derives local date fields from start_date_local local-clock components', () => {
    const activity = normalizeStravaActivity(
      createActivity({
        start_date: '2026-01-02T06:30:00Z',
        start_date_local: '2026-01-01T23:30:00Z',
      }),
    )

    expect(activity.startTime).toBe('2026-01-01T23:30:00Z')
    expect(activity.localDate).toBe('2026-01-01')
    expect(activity.year).toBe(2026)
    expect(activity.month).toBe(1)
    expect(activity.dayOfWeek).toBe('thursday')
    expect(activity.isWeekend).toBe(false)
  })

  it('does not shift UTC-looking start_date_local values by host timezone', () => {
    const activity = normalizeStravaActivity(
      createActivity({
        start_date_local: '2026-03-08T00:30:00Z',
      }),
    )

    expect(activity.localDate).toBe('2026-03-08')
    expect(activity.dayOfWeek).toBe('sunday')
    expect(activity.isWeekend).toBe(true)
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
    expect(result.activities.map((activity) => activity.id)).toEqual(['1', '2'])
    expect(result.activities[0]?.sportType).toBe('Ride')
  })

  it('does not expose raw Strava field names after normalization', () => {
    const activity = normalizeStravaActivity(createActivity())
    const serialized = JSON.stringify(activity)

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
    total_elevation_gain: 300,
    average_speed: 4.47,
    trainer: false,
    commute: false,
    manual: false,
    ...overrides,
  }
}
