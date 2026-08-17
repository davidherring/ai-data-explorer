import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseCookies } from './cookies.js'
import {
  createStravaAuthorizationUrl,
  exchangeAuthorizationCode,
  getValidStravaTokenBundle,
  handleStravaDisconnect,
  handleStravaOAuthCallback,
  handleStravaStatus,
  hasRequiredStravaScope,
  parseGrantedScopes,
  parseStravaTokenExchangeResponse,
  refreshAccessToken,
  REQUIRED_STRAVA_SCOPE,
  STRAVA_TOKEN_URL,
} from './oauth.js'
import {
  createOAuthStateCookie,
  generateOAuthState,
  isValidOAuthState,
  STRAVA_OAUTH_STATE_COOKIE,
} from './oauthState.js'
import {
  createStravaTokenCookie,
  clearStravaTokenCookie,
  decryptTokenBundle,
  encryptTokenBundle,
  isStravaTokenNearExpiry,
  readStravaTokenCookie,
  STRAVA_TOKEN_COOKIE,
  type StravaTokenBundle,
} from './tokenCookie.js'

const testConfig = {
  clientId: '12345',
  clientSecret: 'client-secret',
  redirectUri: 'https://example.test/api/strava/auth/callback',
  tokenCookieSecret: 'test-cookie-secret',
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Strava OAuth helpers', () => {
  it('creates the Strava authorization URL with activity:read_all scope', () => {
    const url = new URL(createStravaAuthorizationUrl(testConfig, 'state-value'))

    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe(testConfig.clientId)
    expect(url.searchParams.get('redirect_uri')).toBe(testConfig.redirectUri)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('approval_prompt')).toBe('auto')
    expect(url.searchParams.get('scope')).toBe(REQUIRED_STRAVA_SCOPE)
    expect(url.searchParams.get('state')).toBe('state-value')
  })

  it('generates and validates OAuth state values', () => {
    const state = generateOAuthState()

    expect(state).toHaveLength(43)
    expect(isValidOAuthState(state, state)).toBe(true)
    expect(isValidOAuthState(state, `${state}x`)).toBe(false)
    expect(isValidOAuthState(state, undefined)).toBe(false)
  })

  it('creates a short-lived HttpOnly OAuth state cookie', () => {
    const cookie = createOAuthStateCookie('state-value')

    expect(cookie).toContain(`${STRAVA_OAUTH_STATE_COOKIE}=state-value`)
    expect(cookie).toContain('Max-Age=600')
    expect(cookie).toContain('Path=/api/strava/auth')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('parses granted scopes from Strava callback scope formats', () => {
    expect(parseGrantedScopes('read activity:read_all')).toEqual([
      'read',
      'activity:read_all',
    ])
    expect(parseGrantedScopes('read,activity:read_all')).toEqual([
      'read',
      'activity:read_all',
    ])
    expect(hasRequiredStravaScope(['read', 'activity:read_all'])).toBe(true)
    expect(hasRequiredStravaScope(['read', 'activity:read'])).toBe(false)
  })

  it('exchanges an authorization code server-side', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
      })

      const body = init?.body as URLSearchParams
      expect(body.get('client_id')).toBe(testConfig.clientId)
      expect(body.get('client_secret')).toBe(testConfig.clientSecret)
      expect(body.get('code')).toBe('callback-code')
      expect(body.get('grant_type')).toBe('authorization_code')

      return Response.json({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: 1_800_000_000,
        athlete: { id: 6789 },
      })
    })

    const tokenResponse = await exchangeAuthorizationCode(
      'callback-code',
      testConfig,
      fetchMock as typeof fetch,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      STRAVA_TOKEN_URL,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(tokenResponse.access_token).toBe('access-token')
    expect(tokenResponse.refresh_token).toBe('refresh-token')
    expect(tokenResponse.expires_at).toBe(1_800_000_000)
    expect(tokenResponse.athlete?.id).toBe(6789)
  })

  it('rejects malformed token exchange responses', () => {
    expect(() => parseStravaTokenExchangeResponse({ access_token: 'missing' })).toThrow(
      'Malformed Strava token response',
    )
  })
})

describe('Strava token cookie', () => {
  const tokenBundle: StravaTokenBundle = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: 1_800_000_000,
    grantedScopes: ['activity:read_all'],
    athleteId: 6789,
    createdAt: 1_700_000_000,
  }

  it('encrypts token bundles without plaintext token values', () => {
    const encrypted = encryptTokenBundle(tokenBundle, testConfig.tokenCookieSecret)

    expect(encrypted).not.toContain(tokenBundle.accessToken)
    expect(encrypted).not.toContain(tokenBundle.refreshToken)
    expect(decryptTokenBundle(encrypted, testConfig.tokenCookieSecret)).toEqual(
      tokenBundle,
    )
  })

  it('creates an HttpOnly token cookie at Path=/', () => {
    const cookie = createStravaTokenCookie(tokenBundle, testConfig.tokenCookieSecret)

    expect(cookie).toContain(`${STRAVA_TOKEN_COOKIE}=`)
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).not.toContain(tokenBundle.accessToken)
    expect(cookie).not.toContain(tokenBundle.refreshToken)
  })

  it('reads a token bundle from the encrypted cookie', () => {
    const cookie = createStravaTokenCookie(tokenBundle, testConfig.tokenCookieSecret)

    expect(readStravaTokenCookie(cookie, testConfig.tokenCookieSecret)).toEqual(
      tokenBundle,
    )
    expect(readStravaTokenCookie(cookie, 'wrong-secret')).toBeUndefined()
  })

  it('identifies tokens that are expired or near expiry', () => {
    expect(isStravaTokenNearExpiry({ expiresAt: 1_000 }, 500)).toBe(false)
    expect(isStravaTokenNearExpiry({ expiresAt: 800 }, 500)).toBe(true)
    expect(isStravaTokenNearExpiry({ expiresAt: 499 }, 500)).toBe(true)
  })

  it('clears the token cookie at Path=/', () => {
    const cookie = clearStravaTokenCookie()

    expect(cookie).toContain(`${STRAVA_TOKEN_COOKIE}=`)
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })
})

describe('Strava token refresh', () => {
  const expiredTokenBundle: StravaTokenBundle = {
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    expiresAt: 1_000,
    grantedScopes: ['activity:read_all'],
    athleteId: 6789,
    createdAt: 900,
  }

  it('refreshes an access token and preserves rotated refresh tokens', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body as URLSearchParams

      expect(init?.method).toBe('POST')
      expect(body.get('client_id')).toBe(testConfig.clientId)
      expect(body.get('client_secret')).toBe(testConfig.clientSecret)
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('old-refresh-token')

      return Response.json({
        access_token: 'new-access-token',
        refresh_token: 'rotated-refresh-token',
        expires_at: 2_000,
      })
    })

    const refreshed = await refreshAccessToken(
      expiredTokenBundle,
      testConfig,
      fetchMock as typeof fetch,
    )

    expect(refreshed).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'rotated-refresh-token',
      expiresAt: 2_000,
      grantedScopes: ['activity:read_all'],
      athleteId: 6789,
      createdAt: 900,
    })
  })

  it('does not refresh a token that is not near expiry', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const tokenBundle: StravaTokenBundle = {
      ...expiredTokenBundle,
      expiresAt: 10_000,
    }
    const response = createMockResponse()
    const fetchMock = vi.fn()
    const result = await getValidStravaTokenBundle(
      createMockRequest(
        '/api/strava/status',
        createStravaTokenCookie(tokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
      { nowSeconds: 1_000, fetchImplementation: fetchMock as typeof fetch },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      tokenBundle,
      refreshed: false,
    })
    expect(response.headers['Set-Cookie']).toBeUndefined()
  })

  it('sets a new token cookie after refreshing a near-expiry token', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: 'new-access-token',
        refresh_token: 'rotated-refresh-token',
        expires_at: 2_000,
      }),
    )

    const result = await getValidStravaTokenBundle(
      createMockRequest(
        '/api/strava/status',
        createStravaTokenCookie(expiredTokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
      { nowSeconds: 1_000, fetchImplementation: fetchMock as typeof fetch },
    )

    expect(result).toMatchObject({
      ok: true,
      refreshed: true,
    })

    const setCookie = response.headers['Set-Cookie']
    expect(typeof setCookie).toBe('string')
    expect(setCookie).not.toContain('new-access-token')
    expect(setCookie).not.toContain('rotated-refresh-token')
    expect(
      readStravaTokenCookie(setCookie as string, testConfig.tokenCookieSecret),
    ).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'rotated-refresh-token',
      expiresAt: 2_000,
    })
  })

  it('clears the token cookie when refresh fails', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    const result = await getValidStravaTokenBundle(
      createMockRequest(
        '/api/strava/status',
        createStravaTokenCookie(expiredTokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
      {
        nowSeconds: 1_000,
        fetchImplementation: vi.fn(async () => new Response(null, { status: 400 })) as typeof fetch,
      },
    )

    expect(result).toEqual({ ok: false, reason: 'refresh_failed' })
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
    expect(response.headers['Set-Cookie']).toContain('Path=/')
  })
})

describe('Strava status and disconnect handlers', () => {
  const validTokenBundle: StravaTokenBundle = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: 4_000_000_000,
    grantedScopes: ['activity:read_all'],
    athleteId: 6789,
    createdAt: 1_000,
  }

  it('returns disconnected status for a missing token cookie', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    await handleStravaStatus(createMockRequest('/api/strava/status'), response)

    expect(JSON.parse(response.body)).toEqual({
      connected: false,
      reason: 'missing_token',
    })
  })

  it('returns connected status without token values', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    await handleStravaStatus(
      createMockRequest(
        '/api/strava/status',
        createStravaTokenCookie(validTokenBundle, testConfig.tokenCookieSecret),
      ),
      response,
    )

    const body = JSON.parse(response.body)
    expect(body).toEqual({
      connected: true,
      grantedScopes: ['activity:read_all'],
      refreshed: false,
    })
    expect(response.body).not.toContain('access-token')
    expect(response.body).not.toContain('refresh-token')
  })

  it('clears malformed token cookies safely', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    await handleStravaStatus(
      createMockRequest('/api/strava/status', `${STRAVA_TOKEN_COOKIE}=not-valid`),
      response,
    )

    expect(JSON.parse(response.body)).toEqual({
      connected: false,
      reason: 'invalid_token',
    })
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
  })

  it('clears tokens with insufficient scope', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)

    const response = createMockResponse()
    await handleStravaStatus(
      createMockRequest(
        '/api/strava/status',
        createStravaTokenCookie(
          { ...validTokenBundle, grantedScopes: ['activity:read'] },
          testConfig.tokenCookieSecret,
        ),
      ),
      response,
    )

    expect(JSON.parse(response.body)).toEqual({
      connected: false,
      reason: 'insufficient_scope',
    })
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
  })

  it('disconnect clears the Strava token cookie', async () => {
    const response = createMockResponse()
    await handleStravaDisconnect(createMockRequest('/api/strava/disconnect'), response)

    expect(JSON.parse(response.body)).toEqual({ disconnected: true })
    expect(response.headers['Set-Cookie']).toContain(`${STRAVA_TOKEN_COOKIE}=`)
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
    expect(response.headers['Set-Cookie']).toContain('Path=/')
  })
})

describe('Strava callback handler', () => {
  it('rejects denied access and clears the state cookie', async () => {
    const response = createMockResponse()
    await handleStravaOAuthCallback(
      createMockRequest('/api/strava/auth/callback?error=access_denied'),
      response,
    )

    expect(response.statusCode).toBe(302)
    expect(response.headers.Location).toBe('/?strava=access_denied')
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
  })

  it('rejects a missing code', async () => {
    const response = createMockResponse()
    await handleStravaOAuthCallback(
      createMockRequest('/api/strava/auth/callback?state=abc'),
      response,
    )

    expect(response.headers.Location).toBe('/?strava=missing_code')
  })

  it('rejects a bad state before token exchange', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = createMockResponse()
    await handleStravaOAuthCallback(
      createMockRequest(
        '/api/strava/auth/callback?code=callback-code&state=returned&scope=activity:read_all',
        `${STRAVA_OAUTH_STATE_COOKIE}=expected`,
      ),
      response,
    )

    expect(response.headers.Location).toBe('/?strava=bad_state')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('rejects insufficient granted scope before token exchange', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = createMockResponse()
    await handleStravaOAuthCallback(
      createMockRequest(
        '/api/strava/auth/callback?code=callback-code&state=state-value&scope=activity:read',
        `${STRAVA_OAUTH_STATE_COOKIE}=state-value`,
      ),
      response,
    )

    expect(response.headers.Location).toBe('/?strava=insufficient_scope')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('exchanges the code, stores an encrypted token cookie, and redirects', async () => {
    vi.stubEnv('STRAVA_CLIENT_ID', testConfig.clientId)
    vi.stubEnv('STRAVA_CLIENT_SECRET', testConfig.clientSecret)
    vi.stubEnv('STRAVA_REDIRECT_URI', testConfig.redirectUri)
    vi.stubEnv('STRAVA_TOKEN_COOKIE_SECRET', testConfig.tokenCookieSecret)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: 1_800_000_000,
          athlete: { id: 6789 },
        }),
      ),
    )

    const response = createMockResponse()
    await handleStravaOAuthCallback(
      createMockRequest(
        '/api/strava/auth/callback?code=callback-code&state=state-value&scope=activity:read_all',
        `${STRAVA_OAUTH_STATE_COOKIE}=state-value`,
      ),
      response,
    )

    expect(response.headers.Location).toBe('/?strava=connected')
    expect(Array.isArray(response.headers['Set-Cookie'])).toBe(true)

    const setCookies = response.headers['Set-Cookie'] as string[]
    const tokenCookie = setCookies.find((cookie) =>
      cookie.startsWith(`${STRAVA_TOKEN_COOKIE}=`),
    )

    expect(tokenCookie).toBeDefined()
    expect(tokenCookie).not.toContain('access-token')
    expect(tokenCookie).not.toContain('refresh-token')

    const parsedToken = parseCookies(tokenCookie).get(STRAVA_TOKEN_COOKIE)

    expect(parsedToken).toBeDefined()
    expect(decryptTokenBundle(parsedToken ?? '', testConfig.tokenCookieSecret)).toMatchObject(
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 1_800_000_000,
        grantedScopes: ['activity:read_all'],
        athleteId: 6789,
      },
    )

    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
})

function createMockRequest(
  url: string,
  cookieHeader?: string,
): IncomingMessage {
  return {
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
