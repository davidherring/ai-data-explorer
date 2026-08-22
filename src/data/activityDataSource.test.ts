import { describe, expect, it, vi } from 'vitest'
import {
  loadDemoActivitySource,
  loadStravaActivitySource,
  ActivityDataSourceError,
} from './activityDataSource.ts'
import { loadDemoActivities } from './demoDataset.ts'
import type { Activity } from './activity.ts'

describe('activity data source service', () => {
  it('loads demo activities offline without fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadDemoActivitySource()

    expect(result.activities).toEqual(loadDemoActivities())
    expect(result.metadata?.total).toBe(result.activities.length)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('loads normalized Strava activities from the activities endpoint', async () => {
    const activity = createActivity({ id: 'strava-1' })
    const result = await loadStravaActivitySource(
      vi.fn(async () =>
        Response.json({
          activities: [activity],
          total: 1,
          filteredOut: 0,
          deduplicated: 0,
          refreshed: true,
        }),
      ) as typeof fetch,
    )

    expect(result).toEqual({
      activities: [activity],
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
      loadStravaActivitySource(
        vi.fn(async () =>
          Response.json({ error: 'not_connected' }, { status: 401 }),
        ) as typeof fetch,
      ),
    ).rejects.toMatchObject({
      code: 'notConnected',
    } satisfies Partial<ActivityDataSourceError>)
  })

  it('rejects malformed or non-normalized Strava responses', async () => {
    await expect(
      loadStravaActivitySource(
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
    } satisfies Partial<ActivityDataSourceError>)
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
    averageSpeedMph: 10,
    elevationGainFeet: 1000,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
    ...overrides,
  }
}

