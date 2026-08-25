import type {
  ActivityDataSourceSnapshot,
  ActivityDataSourceStatus,
} from '../hooks/useActivityDataSource.ts'
import type { ActivityDataSourceId } from '../data/activityDataSource.ts'

type ActivityDataSourceControlProps = {
  source: ActivityDataSourceId
  status: ActivityDataSourceStatus
  activityCount: number
  metadata: ActivityDataSourceSnapshot['metadata']
  error?: string
  onSourceChange: (source: ActivityDataSourceId) => void
  onRefresh: () => void
}

export function ActivityDataSourceControl({
  source,
  status,
  activityCount,
  metadata,
  error,
  onSourceChange,
  onRefresh,
}: ActivityDataSourceControlProps) {
  return (
    <div className="data-source-control" aria-label="Activity data source">
      <label className="data-source-select">
        <span>Data source</span>
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value as ActivityDataSourceId)}
        >
          <option value="demo">Demo</option>
          <option value="strava">Strava</option>
        </select>
      </label>

      <span className="data-source-status" aria-live="polite">
        {formatStatus(status, activityCount, metadata, error)}
      </span>

      <button className="secondary-button" type="button" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  )
}

function formatStatus(
  status: ActivityDataSourceStatus,
  activityCount: number,
  metadata: ActivityDataSourceSnapshot['metadata'],
  error?: string,
): string {
  if (status === 'loading') {
    return 'Loading activities'
  }

  if (status === 'notConnected') {
    return 'Strava not connected'
  }

  if (status === 'error') {
    return error ?? 'Activity source unavailable'
  }

  if (status === 'ready') {
    const refreshed = metadata?.refreshed ? ' refreshed token' : ''
    return `${activityCount} activities${refreshed}`
  }

  return 'Activity source idle'
}
