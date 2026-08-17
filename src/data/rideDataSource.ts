import { loadDemoRides } from './demoDataset.ts'
import type { Ride, DayOfWeek } from './ride.ts'

export type RideDataSourceId = 'demo' | 'strava'

export type RideDataSourceMetadata = {
  total?: number
  filteredOut?: number
  deduplicated?: number
  refreshed?: boolean
}

export type RideDataSourceLoadResult = {
  rides: Ride[]
  metadata?: RideDataSourceMetadata
}

export type StravaActivitiesResponse = {
  rides: Ride[]
  total: number
  filteredOut: number
  deduplicated: number
  refreshed: boolean
}

export type RideDataSourceErrorCode =
  | 'notConnected'
  | 'requestFailed'
  | 'invalidResponse'

export class RideDataSourceError extends Error {
  readonly code: RideDataSourceErrorCode

  constructor(code: RideDataSourceErrorCode, message: string) {
    super(message)
    this.name = 'RideDataSourceError'
    this.code = code
  }
}

export async function loadRidesForSource(
  source: RideDataSourceId,
  fetchImplementation: typeof fetch = fetch,
): Promise<RideDataSourceLoadResult> {
  if (source === 'demo') {
    return loadDemoRideSource()
  }

  return loadStravaRideSource(fetchImplementation)
}

export async function loadDemoRideSource(): Promise<RideDataSourceLoadResult> {
  const rides = loadDemoRides()

  return {
    rides,
    metadata: {
      total: rides.length,
    },
  }
}

export async function loadStravaRideSource(
  fetchImplementation: typeof fetch = fetch,
): Promise<RideDataSourceLoadResult> {
  const response = await fetchImplementation('/api/strava/activities')

  if (response.status === 401) {
    throw new RideDataSourceError('notConnected', 'Strava is not connected.')
  }

  if (!response.ok) {
    throw new RideDataSourceError('requestFailed', 'Unable to load Strava rides.')
  }

  const payload = parseStravaActivitiesResponse(await response.json())

  return {
    rides: payload.rides,
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
    throw new RideDataSourceError('invalidResponse', 'Invalid Strava ride response.')
  }

  const candidate = value as Partial<StravaActivitiesResponse>

  if (
    !Array.isArray(candidate.rides) ||
    typeof candidate.total !== 'number' ||
    typeof candidate.filteredOut !== 'number' ||
    typeof candidate.deduplicated !== 'number' ||
    typeof candidate.refreshed !== 'boolean'
  ) {
    throw new RideDataSourceError('invalidResponse', 'Invalid Strava ride response.')
  }

  return {
    rides: candidate.rides.map(parseRide),
    total: candidate.total,
    filteredOut: candidate.filteredOut,
    deduplicated: candidate.deduplicated,
    refreshed: candidate.refreshed,
  }
}

function parseRide(value: unknown): Ride {
  if (!value || typeof value !== 'object') {
    throw new RideDataSourceError('invalidResponse', 'Invalid Strava ride.')
  }

  const candidate = value as Partial<Ride>

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
    throw new RideDataSourceError('invalidResponse', 'Invalid Strava ride.')
  }

  if (
    candidate.temperatureF !== undefined &&
    typeof candidate.temperatureF !== 'number'
  ) {
    throw new RideDataSourceError('invalidResponse', 'Invalid Strava ride.')
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
