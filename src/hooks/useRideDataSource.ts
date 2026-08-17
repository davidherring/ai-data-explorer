import { useCallback, useEffect, useState } from 'react'
import {
  loadRidesForSource,
  RideDataSourceError,
  type RideDataSourceId,
  type RideDataSourceMetadata,
} from '../data/rideDataSource.ts'
import type { Ride } from '../data/ride.ts'

export type RideDataSourceStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'notConnected'

export type RideDataSourceSnapshot = {
  source: RideDataSourceId
  status: RideDataSourceStatus
  rides: Ride[]
  error?: string
  metadata?: RideDataSourceMetadata
}

export type UseRideDataSourceResult = RideDataSourceSnapshot & {
  setSource: (source: RideDataSourceId) => void
  refresh: () => Promise<void>
}

export function getInitialRideDataSource(
  locationSearch = globalThis.location?.search ?? '',
): RideDataSourceId {
  const params = new URLSearchParams(locationSearch)

  return params.get('strava') === 'connected' ? 'strava' : 'demo'
}

export function useRideDataSource(
  initialSource: RideDataSourceId = getInitialRideDataSource(),
): UseRideDataSourceResult {
  const [snapshot, setSnapshot] = useState<RideDataSourceSnapshot>({
    source: initialSource,
    status: 'idle',
    rides: [],
  })

  const loadSource = useCallback(
    async (source: RideDataSourceId, preserveExistingRides: boolean) => {
      setSnapshot((current) => ({
        source,
        status: 'loading',
        rides: preserveExistingRides ? current.rides : [],
        metadata: preserveExistingRides ? current.metadata : undefined,
      }))

      try {
        const result = await loadRidesForSource(source)
        setSnapshot({
          source,
          status: 'ready',
          rides: result.rides,
          metadata: result.metadata,
        })
      } catch (error) {
        const status =
          error instanceof RideDataSourceError && error.code === 'notConnected'
            ? 'notConnected'
            : 'error'

        setSnapshot((current) => ({
          source,
          status,
          rides: preserveExistingRides ? current.rides : [],
          metadata: preserveExistingRides ? current.metadata : undefined,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load ride data source.',
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
    setSource: (source: RideDataSourceId) => {
      setSnapshot((current) => ({
        ...current,
        source,
      }))
    },
    refresh,
  }
}
