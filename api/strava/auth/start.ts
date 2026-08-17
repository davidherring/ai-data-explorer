import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleStravaOAuthStart } from '../../../server/strava/oauth.ts'

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== 'GET') {
    response.statusCode = 405
    response.setHeader('Allow', 'GET')
    response.end()
    return
  }

  await handleStravaOAuthStart(request, response)
}

