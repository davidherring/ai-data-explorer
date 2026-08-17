import { describe, expect, it, vi } from 'vitest'
import {
  loadDemoRideSource,
  loadStravaRideSource,
  RideDataSourceError,
} from './rideDataSource.ts'
import { loadDemoRides } from './demoDataset.ts'
import type { Ride } from './ride.ts'

describe('ride data source service', () => {
  it('loads demo rides offline without fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadDemoRideSource()

    expect(result.rides).toEqual(loadDemoRides())
    expect(result.metadata?.total).toBe(result.rides.length)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('loads normalized Strava rides from the activities endpoint', async () => {
    const ride = createRide({ id: 'strava-1' })
    const result = await loadStravaRideSource(
      vi.fn(async () =>
        Response.json({
          rides: [ride],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: true,
        }),
      ) as typeof fetch,
    )

    expect(result).toEqual({
      rides: [ride],
      metadata: {
        total: 1,
        filteredOut: 0,
        deduplicated: 0,
        refreshed: true,
      },
    })
  })

  it('maps disconnected Strava responses to notConnected', async () => {
    await expect(
      loadStravaRideSource(
        vi.fn(async () =>
          Response.json({ error: 'not_connected' }, { status: 401 }),
        ) as typeof fetch,
      ),
    ).rejects.toMatchObject({
      code: 'notConnected',
    } satisfies Partial<RideDataSourceError>)
  })

  it('rejects malformed or non-normalized Strava responses', async () => {
    await expect(
      loadStravaRideSource(
        vi.fn(async () =>
          Response.json({
            activities: [{ id: 1, sport_type: 'Ride' }],
            total: 1,
            filteredOut: 0,
            deduplicated: 0,
            refreshed: false,
          }),
        ) as typeof fetch,
      ),
    ).rejects.toMatchObject({
      code: 'invalidResponse',
    } satisfies Partial<RideDataSourceError>)
  })
})

function createRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: 'ride-1',
    startTime: '2026-01-01T08:00:00Z',
    localDate: '2026-01-01',
    year: 2026,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 'thursday',
    isWeekend: false,
    distanceMiles: 10,
    movingTimeMinutes: 60,
    elapsedTimeMinutes: 65,
    averageSpeedMph: 10,
    elevationGainFeet: 1000,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
    ...overrides,
  }
}

