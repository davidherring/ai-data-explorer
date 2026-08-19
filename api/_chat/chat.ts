import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from 'ai'
import { createAnalysisTools } from './tools.ts'
import { buildChatSystemPrompt } from './prompt.ts'
import {
  chatRequestSchema,
  MAX_CHAT_REQUEST_BYTES,
  type ChatRequest,
  type ChatUIMessage,
} from './schema.ts'
import { createChatModel } from './model.ts'

type ChatStreamResult = {
  pipeUIMessageStreamToResponse: (response: ServerResponse) => void
}

type ChatStreamText = (options: {
  model: LanguageModel
  system: string
  messages: ModelMessage[]
  tools: ReturnType<typeof createAnalysisTools>
  stopWhen: ReturnType<typeof stepCountIs>
}) => ChatStreamResult

type ConvertMessages = (messages: ChatUIMessage[]) => Promise<ModelMessage[]>

export type ChatHandlerDependencies = {
  streamText: ChatStreamText
  createModel: () => LanguageModel
  convertToModelMessages: ConvertMessages
}

const defaultDependencies: ChatHandlerDependencies = {
  streamText,
  createModel: createChatModel,
  convertToModelMessages: (messages) =>
    convertToModelMessages(messages as never, {
      ignoreIncompleteToolCalls: true,
    }),
}

export async function handleChat(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ChatHandlerDependencies = defaultDependencies,
): Promise<void> {
  let body: unknown

  try {
    body = await readJsonBody(request)
  } catch (error) {
    sendJson(response, isPayloadTooLargeError(error) ? 413 : 400, {
      error: isPayloadTooLargeError(error)
        ? 'chat_payload_too_large'
        : 'invalid_chat_request',
    })
    return
  }

  const parseResult = chatRequestSchema.safeParse(body)

  if (!parseResult.success) {
    sendJson(
      response,
      hasTooManySelectedRidesIssue(parseResult.error.issues) ? 413 : 400,
      {
        error: hasTooManySelectedRidesIssue(parseResult.error.issues)
          ? 'chat_payload_too_large'
          : 'invalid_chat_request',
      },
    )
    return
  }

  await streamChatResponse(parseResult.data, response, dependencies)
}

export async function streamChatResponse(
  chatRequest: ChatRequest,
  response: ServerResponse,
  dependencies: ChatHandlerDependencies = defaultDependencies,
): Promise<void> {
  const system = buildChatSystemPrompt(chatRequest)
  const messages = await dependencies.convertToModelMessages(chatRequest.messages)
  const result = dependencies.streamText({
    model: dependencies.createModel(),
    system,
    messages,
    tools: createAnalysisTools(chatRequest.selectedRides),
    stopWhen: stepCountIs(3),
  })

  result.pipeUIMessageStreamToResponse(response)
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let byteLength = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    byteLength += buffer.byteLength

    if (byteLength > MAX_CHAT_REQUEST_BYTES) {
      throw new PayloadTooLargeError()
    }

    chunks.push(buffer)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')

  if (rawBody.trim() === '') {
    throw new Error('Empty request body')
  }

  return JSON.parse(rawBody)
}

function hasTooManySelectedRidesIssue(
  issues: readonly { message: string }[],
): boolean {
  return issues.some((issue) => issue.message === 'too_many_selected_rides')
}

class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload too large')
  }
}

function isPayloadTooLargeError(error: unknown): error is PayloadTooLargeError {
  return error instanceof PayloadTooLargeError
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}
