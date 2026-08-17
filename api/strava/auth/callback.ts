import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleStravaOAuthCallback } from '../../_strava/oauth.js'

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

  await handleStravaOAuthCallback(request, response)
}
