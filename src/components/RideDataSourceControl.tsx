import type {
  RideDataSourceSnapshot,
  RideDataSourceStatus,
} from '../hooks/useRideDataSource.ts'
import type { RideDataSourceId } from '../data/rideDataSource.ts'

type RideDataSourceControlProps = {
  source: RideDataSourceId
  status: RideDataSourceStatus
  rideCount: number
  metadata: RideDataSourceSnapshot['metadata']
  error?: string
  onSourceChange: (source: RideDataSourceId) => void
  onRefresh: () => void
}

export function RideDataSourceControl({
  source,
  status,
  rideCount,
  metadata,
  error,
  onSourceChange,
  onRefresh,
}: RideDataSourceControlProps) {
  return (
    <div className="data-source-control" aria-label="Ride data source">
      <label className="data-source-select">
        <span>Data source</span>
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value as RideDataSourceId)}
        >
          <option value="demo">Demo</option>
          <option value="strava">Strava</option>
        </select>
      </label>

      <span>{formatStatus(status, rideCount, metadata, error)}</span>

      <button className="secondary-button" type="button" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  )
}

function formatStatus(
  status: RideDataSourceStatus,
  rideCount: number,
  metadata: RideDataSourceSnapshot['metadata'],
  error?: string,
): string {
  if (status === 'loading') {
    return 'Loading rides'
  }

  if (status === 'notConnected') {
    return 'Strava not connected'
  }

  if (status === 'error') {
    return error ?? 'Ride source unavailable'
  }

  if (status === 'ready') {
    const refreshed = metadata?.refreshed ? ' refreshed token' : ''
    return `${rideCount} rides${refreshed}`
  }

  return 'Ride source idle'
}
