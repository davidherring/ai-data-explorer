import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { parseCookies } from './cookies.js'
import {
  createStravaAuthorizationUrl,
  exchangeAuthorizationCode,
  handleStravaOAuthCallback,
  hasRequiredStravaScope,
  parseGrantedScopes,
  parseStravaTokenExchangeResponse,
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
  decryptTokenBundle,
  encryptTokenBundle,
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
} {
  const headers: Record<string, number | string | readonly string[]> = {}

  return {
    statusCode: 200,
    headers,
    setHeader(name: string, value: number | string | readonly string[]) {
      headers[name] = Array.isArray(value) ? [...value] : value
      return this
    },
    end() {
      return this
    },
  } as ServerResponse & {
    headers: Record<string, number | string | readonly string[]>
  }
}
