import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cyclingSportTypes,
  fetchCyclingActivities,
  handleStravaActivities,
  isCyclingSportType,
  StravaActivitiesError,
} from './activities.js'
import { createStravaTokenCookie, type StravaTokenBundle } from './tokenCookie.js'
import activitiesHandler from '../strava/activities.js'

const testConfig = {
  clientId: '12345',
  clientSecret: 'client-secret',
  redirectUri: 'https://example.test/api/strava/auth/callback',
  tokenCookieSecret: 'test-cookie-secret',
}

const validTokenBundle: StravaTokenBundle = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: 4_000_000_000,
  grantedScopes: ['activity:read_all'],
  athleteId: 6789,
  createdAt: 1_700_000_000,
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Strava cycling activity client', () => {
  it('uses the approved cycling sport_type allowlist', () => {
    expect(cyclingSportTypes).toEqual([
      'Ride',
      'MountainBikeRide',
      'GravelRide',
      'VirtualRide',
      'EBikeRide',
      'EMountainBikeRide',
      'Velomobile',
      'Handcycle',
    ])
    expect(isCyclingSportType('Ride')).toBe(true)
    expect(isCyclingSportType('Run')).toBe(false)
  })

  it('paginates full history until a short page and filters cycling sport types', async () => {
    const pageOne = Array.from({ length: 200 }, (_, index) =>
      createRawActivity({
        id: index + 1,
        sport_type: index % 2 === 0 ? 'Ride' : 'Run',
      }),
    )
    const pageTwo = [
      createRawActivity({ id: 201, sport_type: 'MountainBikeRide' }),
      createRawActivity({ id: 202, sport_type: 'Walk' }),
      createRawActivity({ id: 203, sport_type: 'VirtualRide' }),
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(pageOne))
      .mockResolvedValueOnce(Response.json(pageTwo))

    const result = await fetchCyclingActivities('access-token', {
      fetchImplementation: fetchMock as typeof fetch,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('page')).toBe(
      '1',
    )
    expect(
      new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('per_page'),
    ).toBe('200')
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get('page')).toBe(
      '2',
    )
    expect(result.total).toBe(203)
    expect(result.filteredOut).toBe(101)
    expect(result.activities).toHaveLength(102)
    expect(result.activities.every((activity) => isCyclingSportType(activity.sport_type))).toBe(
      true,
    )
  })

  it('returns only the narrow summary activity fields', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          ...createRawActivity({ id: 1, sport_type: 'Ride' }),
          name: 'Private route name',
          athlete: { id: 123 },
          map: { summary_polyline: 'encoded-polyline' },
          start_latlng: [1, 2],
          external_id: 'private-upload-id',
        },
      ]),
    )

    const result = await fetchCyclingActivities('access-token', {
      fetchImplementation: fetchMock as typeof fetch,
    })

    expect(result.activities).toEqual([
      {
        id: 1,
        sport_type: 'Ride',
        start_date: '2026-01-01T15:00:00Z',
        start_date_local: '2026-01-01T08:00:00Z',
        distance: 16093.4,
        moving_time: 3600,
        elapsed_time: 3900,
        total_elevation_gain: 300,
        average_speed: 4.47,
        trainer: false,
        commute: false,
        manual: false,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('encoded-polyline')
    expect(JSON.stringify(result)).not.toContain('Private route name')
    expect(JSON.stringify(result)).not.toContain('private-upload-id')
  })

  it('rejects malformed response arrays', async () => {
    await expect(
      fetchCyclingActivities('access-token', {
        fetchImplementation: vi.fn(async () =>
          Response.json([{ id: 1, sport_type: 'Ride' }]),
        ) as typeof fetch,
      }),
    ).rejects.toMatchObject({
      code: 'strava_malformed_response',
      statusCode: 502,
    })
  })

  it('rejects malformed non-array responses', async () => {
    await expect(
      fetchCyclingActivities('access-token', {
        fetchImplementation: vi.fn(async () =>
          Response.json({ message: 'not an array' }),
        ) as typeof fetch,
      }),
    ).rejects.toMatchObject({
      code: 'strava_malformed_response',
      statusCode: 502,
    })
  })

  it.each([
    [401, 'strava_unauthorized', 401],
    [403, 'strava_forbidden', 403],
    [500, 'strava_upstream_error', 502],
  ] as const)('maps Strava HTTP %s to %s', async (status, code, statusCode) => {
    await expect(
      fetchCyclingActivities('access-token', {
        fetchImplementation: vi.fn(async () => new Response(null, { status })) as typeof fetch,
      }),
    ).rejects.toMatchObject({ code, statusCode })
  })

  it('maps rate limiting with server-side rate-limit metadata', async () => {
    await expect(
      fetchCyclingActivities('access-token', {
        fetchImplementation: vi.fn(
          async () =>
            new Response(null, {
              status: 429,
              headers: {
                'X-Ratelimit-Limit': '600,30000',
                'X-Ratelimit-Usage': '601,1000',
              },
            }),
        ) as typeof fetch,
      }),
    ).rejects.toMatchObject({
      code: 'strava_rate_limited',
      statusCode: 429,
      rateLimit: {
        limit: '600,30000',
        usage: '601,1000',
      },
    } satisfies Partial<StravaActivitiesError>)
  })
})

describe('Strava activities endpoint handler', () => {
  it('returns not_connected when no valid token is available', async () => {
    stubStravaEnv()
    const response = createMockResponse()

    await handleStravaActivities(createMockRequest('/api/strava/activities'), response)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toEqual({ error: 'not_connected' })
  })

  it('uses a refreshed token for activity retrieval and returns normalized rides', async () => {
    stubStravaEnv()

    const nearExpiredToken: StravaTokenBundle = {
      ...validTokenBundle,
      expiresAt: 1_000,
      refreshToken: 'old-refresh-token',
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: 'new-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_at: 4_000_000_000,
        }),
      )
      .mockResolvedValueOnce(
        Response.json([createRawActivity({ id: 1, sport_type: 'Ride' })]),
      )

    vi.stubGlobal('fetch', fetchMock)

    const response = createMockResponse()
    await handleStravaActivities(
      createMockRequest(
        '/api/strava/activities',
        createStravaTokenCookie(nearExpiredToken, testConfig.tokenCookieSecret),
      ),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      headers: {
        Authorization: 'Bearer new-access-token',
      },
    })
    const body = JSON.parse(response.body)

    expect(body).toMatchObject({
      total: 1,
      filteredOut: 0,
      deduplicated: 0,
      refreshed: true,
    })
    expect(body.rides).toHaveLength(1)
    expect(body.rides[0]).toMatchObject({
      id: '1',
      startTime: '2026-01-01T08:00:00Z',
      localDate: '2026-01-01',
      sportType: 'Ride',
      trainer: false,
      commute: false,
      manual: false,
    })
    expect(response.body).not.toContain('new-access-token')
    expect(response.body).not.toContain('rotated-refresh-token')
    expect(response.body).not.toContain('sport_type')
    expect(response.body).not.toContain('start_date_local')
  })

  it('reports endpoint-level deduplication after cycling filtering', async () => {
    stubStravaEnv()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          createRawActivity({ id: 1, sport_type: 'Ride' }),
          createRawActivity({ id: 1, sport_type: 'GravelRide' }),
          createRawActivity({ id: 2, sport_type: 'Run' }),
        ]),
      ),
    )

    const response = createMockResponse()
    await handleStravaActivities(
      createMockRequest(
        '/api/strava/activities',
        createStravaTokenCookie(validTokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
    )

    const body = JSON.parse(response.body)

    expect(body).toMatchObject({
      total: 3,
      filteredOut: 1,
      deduplicated: 1,
      refreshed: false,
    })
    expect(
      body.rides.map((ride: { id: string; sportType: string }) => ({
        id: ride.id,
        sportType: ride.sportType,
      })),
    ).toEqual([{ id: '1', sportType: 'Ride' }])
  })

  it('maps Strava rate limits to a simple browser-facing error', async () => {
    stubStravaEnv()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, {
            status: 429,
            headers: {
              'X-Ratelimit-Limit': '600,30000',
              'X-Ratelimit-Usage': '601,1000',
            },
          }),
      ),
    )

    const response = createMockResponse()
    await handleStravaActivities(
      createMockRequest(
        '/api/strava/activities',
        createStravaTokenCookie(validTokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
    )

    expect(response.statusCode).toBe(429)
    expect(JSON.parse(response.body)).toEqual({ error: 'strava_rate_limited' })
  })

  it('rejects non-GET methods', async () => {
    const response = createMockResponse()

    await activitiesHandler(
      createMockRequest('/api/strava/activities', undefined, 'POST'),
      response,
    )

    expect(response.statusCode).toBe(405)
    expect(response.headers.Allow).toBe('GET')
  })
})

function createRawActivity(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 1,
    sport_type: 'Ride',
    start_date: '2026-01-01T15:00:00Z',
    start_date_local: '2026-01-01T08:00:00Z',
    distance: 16093.4,
    moving_time: 3600,
    elapsed_time: 3900,
    total_elevation_gain: 300,
    average_speed: 4.47,
    trainer: false,
    commute: false,
    manual: false,
    type: 'Ride',
    ...overrides,
  }
}

function stubStravaEnv() {
  vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
  vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
  vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
  vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)
}

function createMockRequest(
  url: string,
  cookieHeader?: string,
  method = 'GET',
): IncomingMessage {
  return {
    method,
    url,
    headers: {
      host: 'example.test',
      cookie: cookieHeader,
    } satisfies IncomingHttpHeaders,
  } as IncomingMessage
}

function createMockResponse(): ServerResponse & {
  headers: Record<string, number | string | readonly string[]>
  body: string
} {
  const headers: Record<string, number | string | readonly string[]> = {}
  let body = ''

  return {
    statusCode: 200,
    headers,
    get body() {
      return body
    },
    setHeader(name: string, value: number | string | readonly string[]) {
      headers[name] = Array.isArray(value) ? [...value] : value
      return this
    },
    end(chunk?: string) {
      if (chunk) {
        body = chunk
      }
      return this
    },
  } as ServerResponse & {
    headers: Record<string, number | string | readonly string[]>
    body: string
  }
}
