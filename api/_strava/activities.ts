import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  getValidStravaTokenBundle,
  type FetchLike,
} from './oauth.js'
import { normalizeStravaActivities } from './normalizeActivity.js'

const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3'
const STRAVA_ACTIVITIES_PER_PAGE = 200

export const supportedStravaActivityTypes = [
  'Ride',
  'MountainBikeRide',
  'GravelRide',
  'VirtualRide',
  'EBikeRide',
  'EMountainBikeRide',
  'Velomobile',
  'Handcycle',
  'Walk',
  'Hike',
] as const

export type SupportedStravaActivityType =
  (typeof supportedStravaActivityTypes)[number]

export type StravaSummaryActivity = {
  id: number
  sport_type: string
  start_date: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  trainer: boolean
  commute: boolean
  manual: boolean
}

export type StravaActivitiesResult = {
  activities: ReturnType<typeof normalizeStravaActivities>['activities']
  total: number
  filteredOut: number
  deduplicated: number
  refreshed: boolean
}

export type StravaActivitiesErrorCode =
  | 'not_connected'
  | 'strava_unauthorized'
  | 'strava_forbidden'
  | 'strava_rate_limited'
  | 'strava_malformed_response'
  | 'strava_upstream_error'

export class StravaActivitiesError extends Error {
  readonly code: StravaActivitiesErrorCode
  readonly statusCode: number
  readonly rateLimit?: StravaRateLimitInfo

  constructor(
    code: StravaActivitiesErrorCode,
    statusCode: number,
    rateLimit?: StravaRateLimitInfo,
  ) {
    super(code)
    this.code = code
    this.statusCode = statusCode
    this.rateLimit = rateLimit
  }
}

type StravaRateLimitInfo = {
  limit?: string
  usage?: string
}

export function isSupportedStravaActivityType(
  sportType: string,
): sportType is SupportedStravaActivityType {
  return (supportedStravaActivityTypes as readonly string[]).includes(sportType)
}

export async function fetchSupportedActivities(
  accessToken: string,
  options: {
    fetchImplementation?: FetchLike
    perPage?: number
  } = {},
): Promise<{
  activities: StravaSummaryActivity[]
  total: number
  filteredOut: number
}> {
  const fetchImplementation = options.fetchImplementation ?? fetch
  const perPage = options.perPage ?? STRAVA_ACTIVITIES_PER_PAGE
  const activities: StravaSummaryActivity[] = []
  let total = 0
  let filteredOut = 0
  let page = 1

  while (true) {
    const pageActivities = await fetchActivityPage(
      accessToken,
      page,
      perPage,
      fetchImplementation,
    )

    total += pageActivities.length

    for (const activity of pageActivities) {
      if (isSupportedStravaActivityType(activity.sport_type)) {
        activities.push(activity)
      } else {
        filteredOut += 1
      }
    }

    if (pageActivities.length < perPage) {
      break
    }

    page += 1
  }

  return {
    activities,
    total,
    filteredOut,
  }
}

export async function handleStravaActivities(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const tokenResult = await getValidStravaTokenBundle(request, response)

  if (!tokenResult.ok) {
    sendJson(response, 401, { error: 'not_connected' })
    return
  }

  try {
    const result = await fetchSupportedActivities(tokenResult.tokenBundle.accessToken)
    const normalized = normalizeStravaActivities(result.activities)

    sendJson(response, 200, {
      activities: normalized.activities,
      total: result.total,
      filteredOut: result.filteredOut,
      deduplicated: normalized.deduplicated,
      refreshed: tokenResult.refreshed,
    } satisfies StravaActivitiesResult)
  } catch (error) {
    if (error instanceof StravaActivitiesError) {
      sendJson(response, error.statusCode, { error: error.code })
      return
    }

    sendJson(response, 502, { error: 'strava_upstream_error' })
  }
}

async function fetchActivityPage(
  accessToken: string,
  page: number,
  perPage: number,
  fetchImplementation: FetchLike,
): Promise<StravaSummaryActivity[]> {
  const url = new URL('/api/v3/athlete/activities', STRAVA_API_BASE_URL)
  url.searchParams.set('page', page.toString())
  url.searchParams.set('per_page', perPage.toString())

  const response = await fetchImplementation(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw mapStravaResponseError(response)
  }

  const value = await response.json()

  if (!Array.isArray(value)) {
    throw new StravaActivitiesError('strava_malformed_response', 502)
  }

  return value.map(parseStravaSummaryActivity)
}

function parseStravaSummaryActivity(value: unknown): StravaSummaryActivity {
  if (!value || typeof value !== 'object') {
    throw new StravaActivitiesError('strava_malformed_response', 502)
  }

  const candidate = value as Partial<StravaSummaryActivity>

  if (
    typeof candidate.id !== 'number' ||
    typeof candidate.sport_type !== 'string' ||
    typeof candidate.start_date !== 'string' ||
    typeof candidate.start_date_local !== 'string' ||
    typeof candidate.distance !== 'number' ||
    typeof candidate.moving_time !== 'number' ||
    typeof candidate.elapsed_time !== 'number' ||
    typeof candidate.total_elevation_gain !== 'number' ||
    typeof candidate.average_speed !== 'number' ||
    typeof candidate.trainer !== 'boolean' ||
    typeof candidate.commute !== 'boolean' ||
    typeof candidate.manual !== 'boolean'
  ) {
    throw new StravaActivitiesError('strava_malformed_response', 502)
  }

  return {
    id: candidate.id,
    sport_type: candidate.sport_type,
    start_date: candidate.start_date,
    start_date_local: candidate.start_date_local,
    distance: candidate.distance,
    moving_time: candidate.moving_time,
    elapsed_time: candidate.elapsed_time,
    total_elevation_gain: candidate.total_elevation_gain,
    average_speed: candidate.average_speed,
    trainer: candidate.trainer,
    commute: candidate.commute,
    manual: candidate.manual,
  }
}

function mapStravaResponseError(response: Response): StravaActivitiesError {
  if (response.status === 401) {
    return new StravaActivitiesError('strava_unauthorized', 401)
  }

  if (response.status === 403) {
    return new StravaActivitiesError('strava_forbidden', 403)
  }

  if (response.status === 429) {
    return new StravaActivitiesError(
      'strava_rate_limited',
      429,
      getRateLimitInfo(response),
    )
  }

  return new StravaActivitiesError('strava_upstream_error', 502)
}

function getRateLimitInfo(response: Response): StravaRateLimitInfo {
  return {
    limit: response.headers.get('X-Ratelimit-Limit') ?? undefined,
    usage: response.headers.get('X-Ratelimit-Usage') ?? undefined,
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}
