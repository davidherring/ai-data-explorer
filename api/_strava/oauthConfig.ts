export type StravaOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  tokenCookieSecret: string
}

const requiredEnvKeys = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_REDIRECT_URI',
  'STRAVA_TOKEN_COOKIE_SECRET',
] as const

export function getStravaOAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): StravaOAuthConfig {
  const missing = requiredEnvKeys.filter((key) => !env[key])

  if (missing.length > 0) {
    throw new Error(`Missing Strava OAuth environment variables: ${missing.join(', ')}`)
  }

  return {
    clientId: env.STRAVA_CLIENT_ID ?? '',
    clientSecret: env.STRAVA_CLIENT_SECRET ?? '',
    redirectUri: env.STRAVA_REDIRECT_URI ?? '',
    tokenCookieSecret: env.STRAVA_TOKEN_COOKIE_SECRET ?? '',
  }
}
