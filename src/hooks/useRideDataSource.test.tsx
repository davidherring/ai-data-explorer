import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getInitialRideDataSource,
  useRideDataSource,
} from './useRideDataSource.ts'
import type { Ride } from '../data/ride.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useRideDataSource', () => {
  it('defaults to demo unless the current OAuth return is connected', () => {
    expect(getInitialRideDataSource('')).toBe('demo')
    expect(getInitialRideDataSource('?strava=connected')).toBe('strava')
    expect(getInitialRideDataSource('?strava=access_denied')).toBe('demo')
  })

  it('loads demo rides by default', async () => {
    const { result } = renderHook(() => useRideDataSource('demo'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.source).toBe('demo')
    expect(result.current.rides.length).toBeGreaterThan(0)
  })

  it('loads Strava rides when selected', async () => {
    const ride = createRide({ id: 'strava-1' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          rides: [ride],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: false,
        }),
      ),
    )

    const { result } = renderHook(() => useRideDataSource('demo'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.setSource('strava'))

    await waitFor(() => {
      expect(result.current.source).toBe('strava')
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.rides).toEqual([ride])
  })

  it('represents disconnected Strava state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'not_connected' }, { status: 401 }),
      ),
    )

    const { result } = renderHook(() => useRideDataSource('strava'))

    await waitFor(() => expect(result.current.status).toBe('notConnected'))

    expect(result.current.rides).toEqual([])
  })

  it('refresh preserves previously loaded Strava rides on failure', async () => {
    const ride = createRide({ id: 'strava-1' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          rides: [ride],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: false,
        }),
      )
      .mockResolvedValueOnce(Response.json({ error: 'upstream' }, { status: 502 }))

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useRideDataSource('strava'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.rides).toEqual([ride])
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

