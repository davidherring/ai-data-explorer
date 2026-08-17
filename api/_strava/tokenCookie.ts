import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import {
  clearCookie,
  isSecureCookieEnvironment,
  parseCookies,
  serializeCookie,
} from './cookies.js'

export const STRAVA_TOKEN_COOKIE = 'strava_token'

export type StravaTokenBundle = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  grantedScopes: string[]
  athleteId?: number
  createdAt: number
}

const encryptionAlgorithm = 'aes-256-gcm'

export function createStravaTokenCookie(
  tokenBundle: StravaTokenBundle,
  secret: string,
): string {
  return serializeCookie(STRAVA_TOKEN_COOKIE, encryptTokenBundle(tokenBundle, secret), {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureCookieEnvironment(),
    path: '/',
  })
}

export function clearStravaTokenCookie(): string {
  return clearCookie(STRAVA_TOKEN_COOKIE, '/')
}

export function readStravaTokenCookie(
  cookieHeader: string | undefined,
  secret: string,
): StravaTokenBundle | undefined {
  const encryptedValue = parseCookies(cookieHeader).get(STRAVA_TOKEN_COOKIE)

  if (!encryptedValue) {
    return undefined
  }

  return decryptTokenBundle(encryptedValue, secret)
}

export function isStravaTokenNearExpiry(
  tokenBundle: Pick<StravaTokenBundle, 'expiresAt'>,
  nowSeconds = Math.floor(Date.now() / 1000),
  bufferSeconds = 5 * 60,
): boolean {
  return tokenBundle.expiresAt <= nowSeconds + bufferSeconds
}

export function encryptTokenBundle(
  tokenBundle: StravaTokenBundle,
  secret: string,
): string {
  const key = deriveEncryptionKey(secret)
  const iv = randomBytes(12)
  const cipher = createCipheriv(encryptionAlgorithm, key, iv)
  const plaintext = JSON.stringify(tokenBundle)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptTokenBundle(
  encryptedValue: string,
  secret: string,
): StravaTokenBundle | undefined {
  const [ivValue, authTagValue, encryptedPayload] = encryptedValue.split('.')

  if (!ivValue || !authTagValue || !encryptedPayload) {
    return undefined
  }

  try {
    const key = deriveEncryptionKey(secret)
    const decipher = createDecipheriv(
      encryptionAlgorithm,
      key,
      Buffer.from(ivValue, 'base64url'),
    )

    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload, 'base64url')),
      decipher.final(),
    ]).toString('utf8')

    return parseTokenBundle(JSON.parse(decrypted))
  } catch {
    return undefined
  }
}

function deriveEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

function parseTokenBundle(value: unknown): StravaTokenBundle | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<StravaTokenBundle>

  if (
    typeof candidate.accessToken !== 'string' ||
    typeof candidate.refreshToken !== 'string' ||
    typeof candidate.expiresAt !== 'number' ||
    typeof candidate.createdAt !== 'number' ||
    !Array.isArray(candidate.grantedScopes) ||
    !candidate.grantedScopes.every((scope) => typeof scope === 'string')
  ) {
    return undefined
  }

  if (
    candidate.athleteId !== undefined &&
    typeof candidate.athleteId !== 'number'
  ) {
    return undefined
  }

  return {
    accessToken: candidate.accessToken,
    refreshToken: candidate.refreshToken,
    expiresAt: candidate.expiresAt,
    grantedScopes: candidate.grantedScopes,
    athleteId: candidate.athleteId,
    createdAt: candidate.createdAt,
  }
}
