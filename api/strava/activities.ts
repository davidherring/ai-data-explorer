import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleStravaActivities } from '../_strava/activities.js'

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

  await handleStravaActivities(request, response)
}
