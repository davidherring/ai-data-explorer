import { Readable } from 'node:stream'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import {
  convertToModelMessages as convertUiToModelMessages,
  type LanguageModel,
  type ModelMessage,
} from 'ai'
import { buildDatasetProfile } from '../../src/analysis/aiContext.js'
import type { SelectionSummary } from '../../src/analysis/aiContext.js'
import type { GroupedComparison } from '../../src/analysis/groupComparisons.js'
import type { MetricTrendAnalysis } from '../../src/analysis/metricTrends.js'
import type { DayOfWeek, Activity } from '../../src/data/activity.js'
import { defaultAnalysisState } from '../../src/state/analysisState.js'
import { safeParseAnalysisState } from '../../src/state/analysisStateValidation.js'
import chatHandler from '../chat.js'
import {
  handleChat,
  type ChatHandlerDependencies,
} from './chat.js'
import { createAnalysisTools } from './tools.js'
import {
  calculateTrendToolInputSchema,
  compareGroupsToolInputSchema,
  MAX_CHAT_REQUEST_BYTES,
  MAX_SELECTED_ACTIVITIES_FOR_CHAT,
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

  it('rejects selectedActivityCount mismatches', async () => {
    const body = createValidChatBody({
      selectedActivities: [createActivity({ id: 'a' })],
      selectedActivityCount: 2,
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

  it('accepts valid recurring month-day ranges in the analysis state', async () => {
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    }))
    const body = createValidChatBody({
      currentAnalysisState: {
        ...defaultAnalysisState,
        selection: {
          ...defaultAnalysisState.selection,
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 3, day: 15 },
            end: { month: 6, day: 20 },
          },
        },
      },
    })
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies({ streamText: streamTextMock }),
    )

    expect(streamTextMock).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid or reversed recurring month-day ranges', async () => {
    const invalidDayBody = createValidChatBody({
      currentAnalysisState: {
        ...defaultAnalysisState,
        selection: {
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 2, day: 30 },
            end: { month: 3, day: 15 },
          },
        },
      },
    })
    const reversedBody = createValidChatBody({
      currentAnalysisState: {
        ...defaultAnalysisState,
        selection: {
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 6, day: 20 },
            end: { month: 3, day: 15 },
          },
        },
      },
    })

    for (const body of [invalidDayBody, reversedBody]) {
      const response = createMockResponse()

      await handleChat(
        createMockRequest('POST', JSON.stringify(body)),
        response,
        createMockDependencies(),
      )

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
    }
  })

  it('rejects obsolete top-level aggregation state', async () => {
    const body = createValidChatBody({
      currentAnalysisState: {
        ...defaultAnalysisState,
        aggregation: 'raw',
      },
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

  it('uses the shared AnalysisState validation contract for chat state', async () => {
    const invalidState = {
      ...defaultAnalysisState,
      selection: {
        ...defaultAnalysisState.selection,
        recurringDateRange: {
          type: 'recurring-month-day',
          start: { month: 2, day: 29 },
          end: { month: 2, day: 28 },
        },
      },
    }
    const body = createValidChatBody({
      currentAnalysisState: invalidState,
    })
    const response = createMockResponse()

    expect(safeParseAnalysisState(invalidState).success).toBe(false)

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies(),
    )

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
  })

  it('rejects retired metric keys in analysis state', async () => {
    for (const metric of ['elapsedTimeMinutes', 'temperatureF']) {
      const body = createValidChatBody({
        currentAnalysisState: {
          ...defaultAnalysisState,
          view: {
            type: 'trend',
            yMetric: metric,
          },
        },
      })
      const response = createMockResponse()

      await handleChat(
        createMockRequest('POST', JSON.stringify(body)),
        response,
        createMockDependencies(),
      )

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({ error: 'invalid_chat_request' })
    }
  })

  it('rejects average speed as a cumulative view metric', async () => {
    const body = createValidChatBody({
      currentAnalysisState: {
        ...defaultAnalysisState,
        view: {
          type: 'cumulative',
          yMetric: 'averageSpeedMph',
          accumulation: 'continuous',
        },
      },
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

  it('rejects retired metric keys in tool schemas', () => {
    for (const metric of ['elapsedTimeMinutes', 'temperatureF']) {
      expect(() => relationshipToolInputSchema.parse({
        xMetric: metric,
        yMetric: 'averageSpeedMph',
      })).toThrow()
      expect(() => calculateTrendToolInputSchema.parse({ metric })).toThrow()
    }
  })

  it('logs compact validation issues without raw request content', async () => {
    const privateRideId = 'private-activity-id'
    const privateMessageText = 'private question text'
    const body = {
      ...createValidChatBody({
        selectedActivities: [createActivity({ id: privateRideId })],
        selectedActivityCount: 2,
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
              path: ['selectedActivityCount'],
              code: 'custom',
              message: 'selectedActivityCount must match submitted activity count',
            }),
          ]),
        }),
      )
      const loggedPayload = JSON.stringify(warnSpy.mock.calls)
      expect(loggedPayload).not.toContain(privateRideId)
      expect(loggedPayload).not.toContain(privateMessageText)
      expect(loggedPayload).not.toContain('selectedActivities')
      expect(loggedPayload).not.toContain('messages')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('rejects unreasonable selected activity payloads', async () => {
    const selectedActivities = Array.from(
      { length: MAX_SELECTED_ACTIVITIES_FOR_CHAT + 1 },
      (_, index) => createActivity({ id: `activity-${index}` }),
    )
    const body = createValidChatBody({
      selectedActivities,
      selectedActivityCount: selectedActivities.length,
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

  it('builds compact context without serializing raw activities into the system prompt', async () => {
    const body = createValidChatBody({
      selectedActivities: [
        createActivity({
          id: 'private-activity-id',
          startTime: '2026-04-01T07:32:00-07:00',
          localDate: '2026-04-01',
          distanceMiles: 12,
        }),
        createActivity({
          id: 'private-activity-id-2',
          startTime: '2026-04-02T07:32:00-07:00',
          localDate: '2026-04-02',
          distanceMiles: 18,
        }),
        createActivity({
          id: 'private-activity-id-3',
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
    expect(system).not.toContain('selectedActivities')
    expect(system).not.toContain('private-activity-id')
    expect(system).not.toContain('2026-04-01T07:32:00-07:00')
  })

  it('includes calculateTrend interpretation constraints in the system prompt', async () => {
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    }))
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(createValidChatBody())),
      response,
      createMockDependencies({ streamText: streamTextMock }),
    )

    const streamTextCalls = streamTextMock.mock.calls as unknown as Array<
      [{ system: string }]
    >
    const system = streamTextCalls[0][0].system

    expect(system).toContain('calculateTrend')
    expect(system).toContain('do not claim statistical significance')
    expect(system).toContain('practical significance')
  })

  it('strips stale assistant tool output from model-visible history while preserving text and current context', async () => {
    const selectedActivities = [
      createActivity({
        id: 'current-2025-a',
        localDate: '2025-01-01',
        averageSpeedMph: 14,
      }),
      createActivity({
        id: 'current-2025-b',
        localDate: '2025-01-02',
        averageSpeedMph: 15,
      }),
      createActivity({
        id: 'current-2025-c',
        localDate: '2025-01-03',
        averageSpeedMph: 16,
      }),
    ]
    const body = {
      ...createValidChatBody({
        selectedActivities,
        selectedActivityCount: selectedActivities.length,
      }),
      messages: [
        {
          id: 'user-a',
          role: 'user',
          parts: [{ type: 'text', text: 'Previous trend question' }],
        },
        {
          id: 'assistant-a',
          role: 'assistant',
          parts: [
            { type: 'text', text: 'I analyzed the earlier selection.' },
            {
              type: 'tool-calculateTrend',
              toolCallId: 'tool-a',
              state: 'output-available',
              input: { metric: 'averageSpeedMph' },
              output: {
                metric: 'averageSpeedMph',
                dateRange: { start: '2017-01-01', end: '2025-12-31' },
                sampleCount: 40,
                validPointCount: 40,
                missingCount: 0,
                direction: 'increasing',
                status: 'ready',
                warnings: [],
              },
            },
          ],
        },
        {
          id: 'user-b',
          role: 'user',
          parts: [{ type: 'text', text: 'What about the current selection?' }],
        },
      ],
      currentAnalysisState: {
        ...defaultAnalysisState,
        selection: { years: [2025] },
      },
      datasetProfile: buildDatasetProfile(selectedActivities),
      totalActivityCount: selectedActivities.length,
    }
    const streamTextMock = vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    }))
    const response = createMockResponse()

    await handleChat(
      createMockRequest('POST', JSON.stringify(body)),
      response,
      createMockDependencies({
        streamText: streamTextMock,
        convertToModelMessages: (messages) =>
          convertUiToModelMessages(messages as never, {
            ignoreIncompleteToolCalls: true,
          }),
      }),
    )

    const streamTextCalls = streamTextMock.mock.calls as unknown as Array<
      [{ messages: ModelMessage[]; system: string }]
    >
    const modelMessagesJson = JSON.stringify(streamTextCalls[0][0].messages)
    const system = streamTextCalls[0][0].system

    expect(modelMessagesJson).toContain('Previous trend question')
    expect(modelMessagesJson).toContain('I analyzed the earlier selection.')
    expect(modelMessagesJson).toContain('What about the current selection?')
    expect(modelMessagesJson).not.toContain('2017-01-01')
    expect(modelMessagesJson).not.toContain('2025-12-31')
    expect(modelMessagesJson).not.toContain('tool-calculateTrend')
    expect(system).toContain('"years":[2025]')
    expect(system).toContain('"selectedActivityCount":3')
    expect(system).not.toContain('current-2025-a')
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
          compareGroups: expect.any(Object),
          calculateTrend: expect.any(Object),
        }),
      }),
    )
    expect(pipeMock).toHaveBeenCalledWith(response)
  })
})

describe('analysis chat tools', () => {
  it('executes summarizeSelection deterministically over submitted activities', async () => {
    const tools = createAnalysisTools([
      createActivity({ id: 'a', distanceMiles: 10 }),
      createActivity({ id: 'b', distanceMiles: 20 }),
      createActivity({ id: 'c', distanceMiles: 30 }),
    ])
    const output = await executeTool<SelectionSummary>(tools.summarizeSelection, {})

    expect(output).toMatchObject({
      activityCount: 3,
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
      createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
      createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
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

  it('executes compareGroups deterministically over submitted activities', async () => {
    const tools = createAnalysisTools([
      createActivity({
        id: '2019-a',
        localDate: '2019-01-01',
        averageSpeedMph: 12,
        distanceMiles: 10,
      }),
      createActivity({
        id: '2019-b',
        localDate: '2019-01-02',
        averageSpeedMph: 18,
        distanceMiles: 20,
      }),
      createActivity({
        id: '2026-a',
        localDate: '2026-01-01',
        averageSpeedMph: 10,
        distanceMiles: 30,
      }),
      createActivity({
        id: '2026-b',
        localDate: '2026-01-02',
        averageSpeedMph: 14,
        distanceMiles: 40,
      }),
    ])
    const output = await executeTool<GroupedComparison>(tools.compareGroups, {
      groupBy: 'year',
      groups: [2019, 2026],
    })

    expect(output).toMatchObject({
      groupBy: 'year',
      sampleCount: 4,
      groups: [
        expect.objectContaining({
          groupValue: 2019,
          status: 'present',
          activityCount: 2,
        }),
        expect.objectContaining({
          groupValue: 2026,
          status: 'present',
          activityCount: 2,
        }),
      ],
      pairwiseDeltas: expect.objectContaining({
        baselineGroupValue: 2019,
        comparisonGroupValue: 2026,
      }),
    })
    expect(
      output.pairwiseDeltas?.metrics.find(
        (metric) => metric.metric === 'averageSpeedMph',
      )?.mean,
    ).toMatchObject({
      baselineValue: 15,
      comparisonValue: 12,
      absoluteDifference: -3,
      percentDifference: -3 / 15,
    })
    expect(
      output.pairwiseDeltas?.metrics.find(
        (metric) => metric.metric === 'distanceMiles',
      )?.total,
    ).toMatchObject({
      baselineValue: 30,
      comparisonValue: 70,
      absoluteDifference: 40,
    })
  })

  it('returns missing requested group status from compareGroups', async () => {
    const tools = createAnalysisTools([
      createActivity({ id: '2026-a', localDate: '2026-01-01' }),
    ])
    const output = await executeTool<GroupedComparison>(tools.compareGroups, {
      groupBy: 'year',
      groups: [2019, 2026],
    })

    expect(output.groups[0]).toMatchObject({
      groupValue: 2019,
      status: 'missing-requested-group',
      activityCount: 0,
      warnings: [
        { code: 'missing-requested-group', groupValue: 2019 },
        { code: 'empty-selection' },
      ],
    })
  })

  it('validates compareGroups supported grouping inputs', () => {
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'year',
        groups: [2019, 2026],
      }).success,
    ).toBe(true)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'month',
        groups: [1, 12],
      }).success,
    ).toBe(true)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'dayMode',
        groups: ['weekday', 'weekend'],
      }).success,
    ).toBe(true)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'dayOfWeek',
        groups: ['monday', 'sunday'],
      }).success,
    ).toBe(true)
    expect(
      compareGroupsToolInputSchema.safeParse({ groupBy: 'year' }).success,
    ).toBe(true)
  })

  it('rejects malformed compareGroups inputs', () => {
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'sportType',
        groups: ['Ride'],
      }).success,
    ).toBe(false)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'year',
        groups: ['2026'],
      }).success,
    ).toBe(false)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'dayOfWeek',
        groups: [1],
      }).success,
    ).toBe(false)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'dayMode',
        groups: [1],
      }).success,
    ).toBe(false)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'month',
        groups: [0, 13],
      }).success,
    ).toBe(false)
    expect(
      compareGroupsToolInputSchema.safeParse({
        groupBy: 'month',
        groups: [1.5],
      }).success,
    ).toBe(false)
  })

  it('executes calculateTrend deterministically over submitted activities', async () => {
    const tools = createAnalysisTools([
      createActivity({
        id: 'private-a',
        localDate: '2026-01-01',
        averageSpeedMph: 10,
      }),
      createActivity({
        id: 'private-b',
        localDate: '2026-01-11',
        averageSpeedMph: 20,
      }),
      createActivity({
        id: 'private-c',
        localDate: '2026-01-21',
        averageSpeedMph: 30,
      }),
    ])
    const output = await executeTool<MetricTrendAnalysis>(tools.calculateTrend, {
      metric: 'averageSpeedMph',
    })

    expect(output).toMatchObject({
      metric: 'averageSpeedMph',
      label: 'Average speed',
      unit: 'mph',
      sampleCount: 3,
      validPointCount: 3,
      missingCount: 0,
      dateRange: { start: '2026-01-01', end: '2026-01-21' },
      timeSpanDays: 20,
      metricMin: 10,
      metricMax: 30,
      slopePerDay: 1,
      slopePerYear: 365.25,
      estimatedChangeOverRange: 20,
      direction: 'increasing',
      status: 'ready',
      warnings: [],
    })
    expect(output.pearsonR).toBeCloseTo(1)
    expect(output.rSquared).toBeCloseTo(1)
    expect(JSON.stringify(output)).not.toContain('private-a')
    expect(JSON.stringify(output)).not.toContain('private-b')
    expect(JSON.stringify(output)).not.toContain('private-c')
    expect(JSON.stringify(output)).not.toContain('selectedActivities')
    expect(JSON.stringify(output)).not.toContain('"activity"')
  })

  it('validates calculateTrend metric input', () => {
    expect(
      calculateTrendToolInputSchema.safeParse({
        metric: 'averageSpeedMph',
      }).success,
    ).toBe(true)
    expect(
      calculateTrendToolInputSchema.safeParse({
        metric: 'not-a-metric',
      }).success,
    ).toBe(false)
    expect(
      calculateTrendToolInputSchema.safeParse({
        metric: 'averageSpeedMph',
        groupBy: 'year',
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
    currentAnalysisState: unknown
    selectedActivities: Activity[]
    selectedActivityCount: number
  }> = {},
) {
  const selectedActivities =
    overrides.selectedActivities ??
    [
      createActivity({ id: 'a', localDate: '2026-01-01' }),
      createActivity({ id: 'b', localDate: '2026-01-02' }),
      createActivity({ id: 'c', localDate: '2026-01-03' }),
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
    currentAnalysisState: overrides.currentAnalysisState ?? defaultAnalysisState,
    selectedActivities,
    datasetProfile: buildDatasetProfile(selectedActivities),
    selectedActivityCount: overrides.selectedActivityCount ?? selectedActivities.length,
    totalActivityCount: selectedActivities.length,
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

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
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
      | 'averageSpeedMph'
      | 'elevationGainFeet'
      | 'sportType'
      | 'trainer'
      | 'commute'
      | 'manual'
    >
  > = {},
): Activity {
  const localDate = overrides.localDate ?? '2026-01-01'

  return {
    id: overrides.id ?? 'activity-a',
    startTime: overrides.startTime ?? `${localDate}T07:00:00-07:00`,
    localDate,
    year: overrides.year ?? Number(localDate.slice(0, 4)),
    month: overrides.month ?? Number(localDate.slice(5, 7)),
    weekOfYear: overrides.weekOfYear ?? 1,
    dayOfWeek: overrides.dayOfWeek ?? ('wednesday' satisfies DayOfWeek),
    isWeekend: overrides.isWeekend ?? false,
    distanceMiles: overrides.distanceMiles ?? 31.4,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 125,
    averageSpeedMph: overrides.averageSpeedMph ?? 15.4,
    elevationGainFeet: overrides.elevationGainFeet ?? 1250,
    sportType: overrides.sportType ?? 'Ride',
    trainer: overrides.trainer ?? false,
    commute: overrides.commute ?? false,
    manual: overrides.manual ?? false,
  }
}
