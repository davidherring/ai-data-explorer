import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  isSecureCookieEnvironment,
  parseCookies,
  serializeCookie,
} from './cookies.ts'

export const STRAVA_OAUTH_STATE_COOKIE = 'strava_oauth_state'
export const STRAVA_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60
export const STRAVA_OAUTH_STATE_COOKIE_PATH = '/api/strava/auth'

export function generateOAuthState(): string {
  return randomBytes(32).toString('base64url')
}

export function createOAuthStateCookie(state: string): string {
  return serializeCookie(STRAVA_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureCookieEnvironment(),
    path: STRAVA_OAUTH_STATE_COOKIE_PATH,
    maxAgeSeconds: STRAVA_OAUTH_STATE_MAX_AGE_SECONDS,
  })
}

export function readOAuthStateCookie(cookieHeader: string | undefined): string | undefined {
  return parseCookies(cookieHeader).get(STRAVA_OAUTH_STATE_COOKIE)
}

export function isValidOAuthState(
  expectedState: string | undefined,
  returnedState: string | undefined,
): boolean {
  if (!expectedState || !returnedState) {
    return false
  }

  const expected = Buffer.from(expectedState)
  const returned = Buffer.from(returnedState)

  if (expected.length !== returned.length) {
    return false
  }

  return timingSafeEqual(expected, returned)
}

