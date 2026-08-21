import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getInitialActivityDataSource,
  useActivityDataSource,
} from './useActivityDataSource.ts'
import type { Activity } from '../data/activity.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useActivityDataSource', () => {
  it('defaults to demo unless the current OAuth return is connected', () => {
    expect(getInitialActivityDataSource('')).toBe('demo')
    expect(getInitialActivityDataSource('?strava=connected')).toBe('strava')
    expect(getInitialActivityDataSource('?strava=access_denied')).toBe('demo')
  })

  it('loads demo activities by default', async () => {
    const { result } = renderHook(() => useActivityDataSource('demo'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.source).toBe('demo')
    expect(result.current.activities.length).toBeGreaterThan(0)
  })

  it('loads Strava activities when selected', async () => {
    const activity = createActivity({ id: 'strava-1' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          activities: [activity],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: false,
        }),
      ),
    )

    const { result } = renderHook(() => useActivityDataSource('demo'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.setSource('strava'))

    await waitFor(() => {
      expect(result.current.source).toBe('strava')
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.activities).toEqual([activity])
  })

  it('represents disconnected Strava state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'not_connected' }, { status: 401 }),
      ),
    )

    const { result } = renderHook(() => useActivityDataSource('strava'))

    await waitFor(() => expect(result.current.status).toBe('notConnected'))

    expect(result.current.activities).toEqual([])
  })

  it('refresh preserves previously loaded Strava activities on failure', async () => {
    const activity = createActivity({ id: 'strava-1' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          activities: [activity],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: false,
        }),
      )
      .mockResolvedValueOnce(Response.json({ error: 'upstream' }, { status: 502 }))

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useActivityDataSource('strava'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.activities).toEqual([activity])
  })
})

function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
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

