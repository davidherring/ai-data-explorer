import { Readable } from 'node:stream'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import type { LanguageModel, ModelMessage } from 'ai'
import { buildDatasetProfile } from '../../src/analysis/aiContext.js'
import type { SelectionSummary } from '../../src/analysis/aiContext.js'
import type { DayOfWeek, Ride } from '../../src/data/ride.js'
import { defaultAnalysisState } from '../../src/state/analysisState.js'
import chatHandler from '../chat.js'
import {
  handleChat,
  type ChatHandlerDependencies,
} from './chat.js'
import { createAnalysisTools } from './tools.js'
import {
  MAX_CHAT_REQUEST_BYTES,
  MAX_SELECTED_RIDES_FOR_CHAT,
  relationshipToolInputSchema,
} from './schema.js'
import { AI_CHAT_MODEL_ID, createChatModel } from './model.js'

describe('chat endpoint route', () => {
  it('rejects non-POST methods', async () => {
    const response = createMockResponse()

    await chatHandler(createMockRequest('GET', ''), response)

    expect(response.statusCode).toBe(405)
    expect(response.headers.Allow).toBe('POST')
  })
})

describe('handleChat', () => {
  it('rejects malformed JSON request bodies', async () => {
    const response = createMockResponse()

    await handleChat(createMockRequest('POST', '{'), response, createMockDependencies())

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
  })

  it('rejects schema-invalid request bodies', async () => {
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify({ messages: [] })),
      response,
      createMockDependencies(),
    )

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
  })

  it('accepts the AI SDK transport envelope fields', async () => {
    const pipeMock = vi.fn()
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: pipeMock,
    }))
    const body = createValidChatBody({
      id: 'chat-a',
      trigger: 'submit-message',
    })
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies({ streamText: streamTextMock }),
    )

    expect(streamTextMock).toHaveBeenCalledTimes(1)
    expect(pipeMock).toHaveBeenCalledWith(response)
  })

  it('accepts an optional transport messageId', async () => {
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    }))
    const body = createValidChatBody({
      id: 'chat-a',
      trigger: 'regenerate-message',
      messageId: 'message-a',
    })
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies({ streamText: streamTextMock }),
    )

    expect(streamTextMock).toHaveBeenCalledTimes(1)
  })

  it('rejects selectedRideCount mismatches', async () => {
    const body = createValidChatBody({
      selectedRides: [createRide({ id: 'a' })],
      selectedRideCount: 2,
    })
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies(),
    )

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
  })

  it('logs compact validation issues without raw request content', async () => {
    const privateRideId = 'private-ride-id'
    const privateMessageText = 'private question text'
    const body = {
      ...createValidChatBody({
        selectedRides: [createRide({ id: privateRideId })],
        selectedRideCount: 2,
      }),
      messages: [
        {
          id: 'message-a',
          role: 'user',
          parts: [{ type: 'text', text: privateMessageText }],
        },
      ],
    }
    const response = createMockResponse()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await handleChat(
        createMockRequest('POST', JSON.stringify(body)),
        response,
        createMockDependencies(),
      )

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
      expect(warnSpy).toHaveBeenCalledWith(
        'Invalid chat request',
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['selectedRideCount'],
              code: 'custom',
              message: 'selectedRideCount must match submitted ride count',
            }),
          ]),
        }),
      )
      const loggedPayload = JSON.stringify(warnSpy.mock.calls)
      expect(loggedPayload).not.toContain(privateRideId)
      expect(loggedPayload).not.toContain(privateMessageText)
      expect(loggedPayload).not.toContain('selectedRides')
      expect(loggedPayload).not.toContain('messages')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('rejects unreasonable selected ride payloads', async () => {
    const selectedRides = Array.from(
      { length: MAX_SELECTED_RIDES_FOR_CHAT + 1 },
      (_, index) => createRide({ id: `ride-${index}` }),
    )
    const body = createValidChatBody({
      selectedRides,
      selectedRideCount: selectedRides.length,
    })
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies(),
    )

    expect(response.statusCode).toBe(413)
    expect(JSON.parse(response.body)).toEqual({ error: 'chat_payload_too_large' })
  })

  it('rejects over-large request bodies', async () => {
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', 'x'.repeat(MAX_CHAT_REQUEST_BYTES + 1)),
      response,
      createMockDependencies(),
    )

    expect(response.statusCode).toBe(413)
    expect(JSON.parse(response.body)).toEqual({ error: 'chat_payload_too_large' })
  })

  it('builds compact context without serializing raw rides into the system prompt', async () => {
    const body = createValidChatBody({
      selectedRides: [
        createRide({
          id: 'private-ride-id',
          startTime: '2026-04-01T07:32:00-07:00',
          localDate: '2026-04-01',
          distanceMiles: 12,
        }),
        createRide({
          id: 'private-ride-id-2',
          startTime: '2026-04-02T07:32:00-07:00',
          localDate: '2026-04-02',
          distanceMiles: 18,
        }),
        createRide({
          id: 'private-ride-id-3',
          startTime: '2026-04-03T07:32:00-07:00',
          localDate: '2026-04-03',
          distanceMiles: 24,
        }),
      ],
    })
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    }))
    const dependencies = createMockDependencies({ streamText: streamTextMock })
    const response = createMockResponse()

    await handleChat(createMockRequest('POST', JSON.stringify(body)), response, dependencies)

    const streamTextCalls = streamTextMock.mock.calls as unknown as Array<
      [{ system: string }]
    >
    expect(streamTextCalls[0]).toBeDefined()
    const system = streamTextCalls[0][0].system
    expect(system).toContain('Current structured analysis context:')
    expect(system).toContain('selectionSummary')
    expect(system).not.toContain('selectedRides')
    expect(system).not.toContain('private-ride-id')
    expect(system).not.toContain('2026-04-01T07:32:00-07:00')
  })

  it('uses the model factory, converts messages, and pipes the UI message stream', async () => {
    const pipeMock = vi.fn()
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: pipeMock,
    }))
    const model = { provider: 'test', modelId: 'model' } as unknown as LanguageModel
    const createModelMock = vi.fn(() => model)
    const convertToModelMessagesMock = vi.fn(async () => [
      { role: 'user', content: [{ type: 'text', text: 'What stands out?' }] },
    ] as ModelMessage[])
    const dependencies = createMockDependencies({
      streamText: streamTextMock,
      createModel: createModelMock,
      convertToModelMessages: convertToModelMessagesMock,
    })
    const body = createValidChatBody()
    const response = createMockResponse()

    await handleChat(createMockRequest('POST', JSON.stringify(body)), response, dependencies)

    expect(createModelMock).toHaveBeenCalledTimes(1)
    expect(convertToModelMessagesMock).toHaveBeenCalledWith(body.messages)
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        messages: expect.any(Array),
        system: expect.any(String),
        tools: expect.objectContaining({
          summarizeSelection: expect.any(Object),
          relationshipBetweenMetrics: expect.any(Object),
        }),
      }),
    )
    expect(pipeMock).toHaveBeenCalledWith(response)
  })
})

describe('analysis chat tools', () => {
  it('executes summarizeSelection deterministically over submitted rides', async () => {
    const tools = createAnalysisTools([
      createRide({ id: 'a', distanceMiles: 10 }),
      createRide({ id: 'b', distanceMiles: 20 }),
      createRide({ id: 'c', distanceMiles: 30 }),
    ])
    const output = await executeTool<SelectionSummary>(tools.summarizeSelection, {})

    expect(output).toMatchObject({
      rideCount: 3,
      metrics: expect.arrayContaining([
        expect.objectContaining({
          metric: 'distanceMiles',
          finiteCount: 3,
          total: 60,
          median: 20,
        }),
      ]),
    })
  })

  it('executes relationshipBetweenMetrics deterministically with metric metadata', async () => {
    const tools = createAnalysisTools([
      createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
      createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
    ])
    const output = await executeTool<RelationshipToolOutput>(
      tools.relationshipBetweenMetrics,
      {
      xMetric: 'elevationGainFeet',
      yMetric: 'averageSpeedMph',
      },
    )

    expect(output).toMatchObject({
      xMetric: 'elevationGainFeet',
      yMetric: 'averageSpeedMph',
      xLabel: 'Elevation gain',
      xUnit: 'ft',
      yLabel: 'Average speed',
      yUnit: 'mph',
      validPairCount: 3,
      status: 'ready',
    })
    expect(output.pearsonR).toBeCloseTo(1)
  })

  it('validates relationship metric keys', () => {
    expect(
      relationshipToolInputSchema.safeParse({
        xMetric: 'not-a-metric',
        yMetric: 'averageSpeedMph',
      }).success,
    ).toBe(false)
  })
})

describe('chat model config', () => {
  it('centralizes the approved model id', () => {
    expect(AI_CHAT_MODEL_ID).toBe('gpt-5.6-luna')
    expect(createChatModel).toEqual(expect.any(Function))
  })
})

function createMockDependencies(
  overrides: Partial<ChatHandlerDependencies> = {},
): ChatHandlerDependencies {
  return {
    streamText: vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    })),
    createModel: vi.fn(() => ({}) as LanguageModel),
    convertToModelMessages: vi.fn(async () => [] as ModelMessage[]),
    ...overrides,
  }
}

async function executeTool<T>(
  toolValue: unknown,
  input: unknown,
): Promise<T> {
  const executableTool = toolValue as {
    execute?: (input: unknown, options: unknown) => Promise<T> | T
  }

  expect(executableTool.execute).toEqual(expect.any(Function))

  return executableTool.execute?.(input, {}) as T
}

type RelationshipToolOutput = {
  pearsonR?: number
  [key: string]: unknown
}

function createValidChatBody(
  overrides: Partial<{
    id: string
    trigger: 'submit-message' | 'regenerate-message'
    messageId: string
    selectedRides: Ride[]
    selectedRideCount: number
  }> = {},
) {
  const selectedRides =
    overrides.selectedRides ??
    [
      createRide({ id: 'a', localDate: '2026-01-01' }),
      createRide({ id: 'b', localDate: '2026-01-02' }),
      createRide({ id: 'c', localDate: '2026-01-03' }),
    ]

  return {
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    messages: [
      {
        id: 'message-a',
        role: 'user',
        parts: [{ type: 'text', text: 'What stands out?' }],
      },
    ],
    ...(overrides.trigger !== undefined ? { trigger: overrides.trigger } : {}),
    ...(overrides.messageId !== undefined
      ? { messageId: overrides.messageId }
      : {}),
    currentAnalysisState: defaultAnalysisState,
    selectedRides,
    datasetProfile: buildDatasetProfile(selectedRides),
    selectedRideCount: overrides.selectedRideCount ?? selectedRides.length,
    totalRideCount: selectedRides.length,
    dataSource: 'demo',
  }
}

function createMockRequest(method: string, body: string): IncomingMessage {
  const request = Readable.from([body]) as IncomingMessage
  request.method = method
  request.url = '/api/chat'
  request.headers = {
    host: 'example.test',
    'content-type': 'application/json',
  } satisfies IncomingHttpHeaders

  return request
}

function createMockResponse(): ServerResponse & {
  headers: Record<string, number | string | readonly string[]>
  body: string
} {
  const headers: Record<string, number | string | readonly string[]> = {}
  let body = ''

  return {
    statusCode: 200,
    headers,
    get body() {
      return body
    },
    setHeader(name: string, value: number | string | readonly string[]) {
      headers[name] = Array.isArray(value) ? [...value] : value
      return this
    },
    end(chunk?: string) {
      if (chunk) {
        body = chunk
      }
      return this
    },
  } as ServerResponse & {
    headers: Record<string, number | string | readonly string[]>
    body: string
  }
}

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'id'
      | 'startTime'
      | 'localDate'
      | 'year'
      | 'month'
      | 'weekOfYear'
      | 'dayOfWeek'
      | 'isWeekend'
      | 'distanceMiles'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'averageSpeedMph'
      | 'elevationGainFeet'
      | 'temperatureF'
      | 'sportType'
      | 'trainer'
      | 'commute'
      | 'manual'
    >
  > = {},
): Ride {
  const localDate = overrides.localDate ?? '2026-01-01'

  return {
    id: overrides.id ?? 'ride-a',
    startTime: overrides.startTime ?? `${localDate}T07:00:00-07:00`,
    localDate,
    year: overrides.year ?? Number(localDate.slice(0, 4)),
    month: overrides.month ?? Number(localDate.slice(5, 7)),
    weekOfYear: overrides.weekOfYear ?? 1,
    dayOfWeek: overrides.dayOfWeek ?? ('wednesday' satisfies DayOfWeek),
    isWeekend: overrides.isWeekend ?? false,
    distanceMiles: overrides.distanceMiles ?? 31.4,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 125,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 141,
    averageSpeedMph: overrides.averageSpeedMph ?? 15.4,
    elevationGainFeet: overrides.elevationGainFeet ?? 1250,
    temperatureF: overrides.temperatureF,
    sportType: overrides.sportType ?? 'Ride',
    trainer: overrides.trainer ?? false,
    commute: overrides.commute ?? false,
    manual: overrides.manual ?? false,
  }
}
