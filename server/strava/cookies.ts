export type CookieOptions = {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  path?: string
  maxAgeSeconds?: number
}

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>()

  if (!cookieHeader) {
    return cookies
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValueParts] = part.trim().split('=')
    if (!rawName || rawValueParts.length === 0) {
      continue
    }

    cookies.set(rawName, decodeURIComponent(rawValueParts.join('=')))
  }

  return cookies
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const attributes = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${options.maxAgeSeconds}`)
  }

  attributes.push(`Path=${options.path ?? '/'}`)

  if (options.httpOnly) {
    attributes.push('HttpOnly')
  }

  if (options.secure) {
    attributes.push('Secure')
  }

  attributes.push(`SameSite=${options.sameSite ?? 'Lax'}`)

  return attributes.join('; ')
}

export function clearCookie(name: string, path = '/'): string {
  return serializeCookie(name, '', {
    path,
    maxAgeSeconds: 0,
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureCookieEnvironment(),
  })
}

export function isSecureCookieEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

