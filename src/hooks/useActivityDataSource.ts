import { useCallback, useEffect, useState } from 'react'
import {
  loadActivitiesForSource,
  ActivityDataSourceError,
  type ActivityDataSourceId,
  type ActivityDataSourceMetadata,
} from '../data/activityDataSource.ts'
import type { Activity } from '../data/activity.ts'

export type ActivityDataSourceStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'notConnected'

export type ActivityDataSourceSnapshot = {
  source: ActivityDataSourceId
  status: ActivityDataSourceStatus
  activities: Activity[]
  error?: string
  metadata?: ActivityDataSourceMetadata
}

export type UseActivityDataSourceResult = ActivityDataSourceSnapshot & {
  setSource: (source: ActivityDataSourceId) => void
  refresh: () => Promise<void>
}

export function getInitialActivityDataSource(
  locationSearch = globalThis.location?.search ?? '',
): ActivityDataSourceId {
  const params = new URLSearchParams(locationSearch)

  return params.get('strava') === 'connected' ? 'strava' : 'demo'
}

export function useActivityDataSource(
  initialSource: ActivityDataSourceId = getInitialActivityDataSource(),
): UseActivityDataSourceResult {
  const [snapshot, setSnapshot] = useState<ActivityDataSourceSnapshot>({
    source: initialSource,
    status: 'idle',
    activities: [],
  })

  const loadSource = useCallback(
    async (source: ActivityDataSourceId, preserveExistingActivities: boolean) => {
      setSnapshot((current) => ({
        source,
        status: 'loading',
        activities: preserveExistingActivities ? current.activities : [],
        metadata: preserveExistingActivities ? current.metadata : undefined,
      }))

      try {
        const result = await loadActivitiesForSource(source)
        setSnapshot({
          source,
          status: 'ready',
          activities: result.activities,
          metadata: result.metadata,
        })
      } catch (error) {
        const status =
          error instanceof ActivityDataSourceError && error.code === 'notConnected'
            ? 'notConnected'
            : 'error'

        setSnapshot((current) => ({
          source,
          status,
          activities: preserveExistingActivities ? current.activities : [],
          metadata: preserveExistingActivities ? current.metadata : undefined,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load activity data source.',
        }))
      }
    },
    [],
  )

  useEffect(() => {
    void loadSource(snapshot.source, false)
  }, [loadSource, snapshot.source])

  const refresh = useCallback(async () => {
    await loadSource(snapshot.source, snapshot.source === 'strava')
  }, [loadSource, snapshot.source])

  return {
    ...snapshot,
    setSource: (source: ActivityDataSourceId) => {
      setSnapshot((current) => ({
        ...current,
        source,
      }))
    },
    refresh,
  }
}
