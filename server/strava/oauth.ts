import type { IncomingMessage, ServerResponse } from 'node:http'
import { clearCookie } from './cookies.ts'
import { getStravaOAuthConfig, type StravaOAuthConfig } from './oauthConfig.ts'
import {
  createOAuthStateCookie,
  generateOAuthState,
  isValidOAuthState,
  readOAuthStateCookie,
  STRAVA_OAUTH_STATE_COOKIE,
  STRAVA_OAUTH_STATE_COOKIE_PATH,
} from './oauthState.ts'
import {
  createStravaTokenCookie,
  type StravaTokenBundle,
} from './tokenCookie.ts'

export const REQUIRED_STRAVA_SCOPE = 'activity:read_all'
export const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize'
export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export type FetchLike = typeof fetch

type StravaTokenExchangeResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
  scope?: string
  athlete?: {
    id?: number
  }
}

export function createStravaAuthorizationUrl(
  config: Pick<StravaOAuthConfig, 'clientId' | 'redirectUri'>,
  state: string,
): string {
  const url = new URL(STRAVA_AUTHORIZE_URL)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('approval_prompt', 'auto')
  url.searchParams.set('scope', REQUIRED_STRAVA_SCOPE)
  url.searchParams.set('state', state)

  return url.toString()
}

export function parseGrantedScopes(scopeValue: string | null | undefined): string[] {
  if (!scopeValue) {
    return []
  }

  return scopeValue
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
}

export function hasRequiredStravaScope(scopes: readonly string[]): boolean {
  return scopes.includes(REQUIRED_STRAVA_SCOPE)
}

export async function exchangeAuthorizationCode(
  code: string,
  config: StravaOAuthConfig,
  fetchImplementation: FetchLike = fetch,
): Promise<StravaTokenExchangeResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
  })

  const response = await fetchImplementation(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw new Error('Strava token exchange failed')
  }

  return parseStravaTokenExchangeResponse(await response.json())
}

export function parseStravaTokenExchangeResponse(
  value: unknown,
): StravaTokenExchangeResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed Strava token response')
  }

  const candidate = value as Partial<StravaTokenExchangeResponse>

  if (
    typeof candidate.access_token !== 'string' ||
    typeof candidate.refresh_token !== 'string' ||
    typeof candidate.expires_at !== 'number'
  ) {
    throw new Error('Malformed Strava token response')
  }

  if (candidate.scope !== undefined && typeof candidate.scope !== 'string') {
    throw new Error('Malformed Strava token response')
  }

  if (
    candidate.athlete !== undefined &&
    (typeof candidate.athlete !== 'object' ||
      candidate.athlete === null ||
      (candidate.athlete.id !== undefined &&
        typeof candidate.athlete.id !== 'number'))
  ) {
    throw new Error('Malformed Strava token response')
  }

  return {
    access_token: candidate.access_token,
    refresh_token: candidate.refresh_token,
    expires_at: candidate.expires_at,
    scope: candidate.scope,
    athlete: candidate.athlete,
  }
}

export async function handleStravaOAuthStart(
  _request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let config: StravaOAuthConfig

  try {
    config = getStravaOAuthConfig()
  } catch {
    redirect(response, '/?strava=configuration_error')
    return
  }

  const state = generateOAuthState()
  response.setHeader('Set-Cookie', createOAuthStateCookie(state))
  redirect(response, createStravaAuthorizationUrl(config, state))
}

export async function handleStravaOAuthCallback(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const clearStateCookie = clearCookie(
    STRAVA_OAUTH_STATE_COOKIE,
    STRAVA_OAUTH_STATE_COOKIE_PATH,
  )

  const callbackUrl = getRequestUrl(request)
  const returnedState = callbackUrl.searchParams.get('state') ?? undefined
  const expectedState = readOAuthStateCookie(request.headers.cookie)

  response.setHeader('Set-Cookie', clearStateCookie)

  if (callbackUrl.searchParams.get('error') === 'access_denied') {
    redirect(response, '/?strava=access_denied')
    return
  }

  const code = callbackUrl.searchParams.get('code')

  if (!code) {
    redirect(response, '/?strava=missing_code')
    return
  }

  if (!isValidOAuthState(expectedState, returnedState)) {
    redirect(response, '/?strava=bad_state')
    return
  }

  const grantedScopes = parseGrantedScopes(callbackUrl.searchParams.get('scope'))

  if (!hasRequiredStravaScope(grantedScopes)) {
    redirect(response, '/?strava=insufficient_scope')
    return
  }

  let config: StravaOAuthConfig

  try {
    config = getStravaOAuthConfig()
  } catch {
    redirect(response, '/?strava=configuration_error')
    return
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode(code, config)
    const tokenBundle: StravaTokenBundle = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      grantedScopes,
      athleteId: tokenResponse.athlete?.id,
      createdAt: Math.floor(Date.now() / 1000),
    }

    response.setHeader('Set-Cookie', [
      clearStateCookie,
      createStravaTokenCookie(tokenBundle, config.tokenCookieSecret),
    ])
    redirect(response, '/?strava=connected')
  } catch {
    redirect(response, '/?strava=token_exchange_failed')
  }
}

function getRequestUrl(request: IncomingMessage): URL {
  const host = request.headers.host ?? 'localhost'
  return new URL(request.url ?? '/', `https://${host}`)
}

function redirect(response: ServerResponse, location: string): void {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.end()
}
