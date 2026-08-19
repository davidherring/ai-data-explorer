import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleChat } from './_chat/chat.ts'

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Allow', 'POST')
    response.end()
    return
  }

  await handleChat(request, response)
}
