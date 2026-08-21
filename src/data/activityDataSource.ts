import { loadDemoActivities } from './demoDataset.ts'
import type { Activity, DayOfWeek } from './activity.ts'

export type ActivityDataSourceId = 'demo' | 'strava'

export type ActivityDataSourceMetadata = {
  total?: number
  filteredOut?: number
  deduplicated?: number
  refreshed?: boolean
}

export type ActivityDataSourceLoadResult = {
  activities: Activity[]
  metadata?: ActivityDataSourceMetadata
}

export type StravaActivitiesResponse = {
  activities: Activity[]
  total: number
  filteredOut: number
  deduplicated: number
  refreshed: boolean
}

export type ActivityDataSourceErrorCode =
  | 'notConnected'
  | 'requestFailed'
  | 'invalidResponse'

export class ActivityDataSourceError extends Error {
  readonly code: ActivityDataSourceErrorCode

  constructor(code: ActivityDataSourceErrorCode, message: string) {
    super(message)
    this.name = 'ActivityDataSourceError'
    this.code = code
  }
}

export async function loadActivitiesForSource(
  source: ActivityDataSourceId,
  fetchImplementation: typeof fetch = fetch,
): Promise<ActivityDataSourceLoadResult> {
  if (source === 'demo') {
    return loadDemoActivitySource()
  }

  return loadStravaActivitySource(fetchImplementation)
}

export async function loadDemoActivitySource(): Promise<ActivityDataSourceLoadResult> {
  const activities = loadDemoActivities()

  return {
    activities,
    metadata: {
      total: activities.length,
    },
  }
}

export async function loadStravaActivitySource(
  fetchImplementation: typeof fetch = fetch,
): Promise<ActivityDataSourceLoadResult> {
  const response = await fetchImplementation('/api/strava/activities')

  if (response.status === 401) {
    throw new ActivityDataSourceError('notConnected', 'Strava is not connected.')
  }

  if (!response.ok) {
    throw new ActivityDataSourceError('requestFailed', 'Unable to load Strava activities.')
  }

  const payload = parseStravaActivitiesResponse(await response.json())

  return {
    activities: payload.activities,
    metadata: {
      total: payload.total,
      filteredOut: payload.filteredOut,
      deduplicated: payload.deduplicated,
      refreshed: payload.refreshed,
    },
  }
}

function parseStravaActivitiesResponse(value: unknown): StravaActivitiesResponse {
  if (!value || typeof value !== 'object') {
    throw new ActivityDataSourceError('invalidResponse', 'Invalid Strava activity response.')
  }

  const candidate = value as Partial<StravaActivitiesResponse>

  if (
    !Array.isArray(candidate.activities) ||
    typeof candidate.total !== 'number' ||
    typeof candidate.filteredOut !== 'number' ||
    typeof candidate.deduplicated !== 'number' ||
    typeof candidate.refreshed !== 'boolean'
  ) {
    throw new ActivityDataSourceError('invalidResponse', 'Invalid Strava activity response.')
  }

  return {
    activities: candidate.activities.map(parseActivity),
    total: candidate.total,
    filteredOut: candidate.filteredOut,
    deduplicated: candidate.deduplicated,
    refreshed: candidate.refreshed,
  }
}

function parseActivity(value: unknown): Activity {
  if (!value || typeof value !== 'object') {
    throw new ActivityDataSourceError('invalidResponse', 'Invalid Strava activity.')
  }

  const candidate = value as Partial<Activity>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.startTime !== 'string' ||
    typeof candidate.localDate !== 'string' ||
    typeof candidate.year !== 'number' ||
    typeof candidate.month !== 'number' ||
    typeof candidate.weekOfYear !== 'number' ||
    typeof candidate.dayOfWeek !== 'string' ||
    !isDayOfWeek(candidate.dayOfWeek) ||
    typeof candidate.isWeekend !== 'boolean' ||
    typeof candidate.distanceMiles !== 'number' ||
    typeof candidate.movingTimeMinutes !== 'number' ||
    typeof candidate.elapsedTimeMinutes !== 'number' ||
    typeof candidate.averageSpeedMph !== 'number' ||
    typeof candidate.elevationGainFeet !== 'number' ||
    typeof candidate.sportType !== 'string' ||
    typeof candidate.trainer !== 'boolean' ||
    typeof candidate.commute !== 'boolean' ||
    typeof candidate.manual !== 'boolean'
  ) {
    throw new ActivityDataSourceError('invalidResponse', 'Invalid Strava activity.')
  }

  if (
    candidate.temperatureF !== undefined &&
    typeof candidate.temperatureF !== 'number'
  ) {
    throw new ActivityDataSourceError('invalidResponse', 'Invalid Strava activity.')
  }

  return {
    id: candidate.id,
    startTime: candidate.startTime,
    localDate: candidate.localDate,
    year: candidate.year,
    month: candidate.month,
    weekOfYear: candidate.weekOfYear,
    dayOfWeek: candidate.dayOfWeek,
    isWeekend: candidate.isWeekend,
    distanceMiles: candidate.distanceMiles,
    movingTimeMinutes: candidate.movingTimeMinutes,
    elapsedTimeMinutes: candidate.elapsedTimeMinutes,
    averageSpeedMph: candidate.averageSpeedMph,
    elevationGainFeet: candidate.elevationGainFeet,
    temperatureF: candidate.temperatureF,
    sportType: candidate.sportType,
    trainer: candidate.trainer,
    commute: candidate.commute,
    manual: candidate.manual,
  }
}

function isDayOfWeek(value: string): value is DayOfWeek {
  return [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ].includes(value)
}
