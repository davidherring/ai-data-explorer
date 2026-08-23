import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { UIMessage } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDatasetProfile, type DatasetProfile } from '../analysis/aiContext.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  defaultAnalysisState,
  type AnalysisState,
} from '../state/analysisState.ts'
import {
  applyViewSuggestion,
  getAnalysisStateFingerprint,
  type ViewSuggestion,
} from '../state/viewSuggestions.ts'
import { ConversationPanelShell } from './ConversationPanelShell.tsx'

const chatState = vi.hoisted(() => ({
  messages: [] as UIMessage[],
  sendMessage: vi.fn(),
  setMessages: vi.fn(),
  status: 'ready' as 'submitted' | 'streaming' | 'ready' | 'error',
  error: undefined as Error | undefined,
  clearError: vi.fn(),
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: () => chatState,
}))

afterEach(() => {
  cleanup()
  chatState.messages = []
  chatState.sendMessage.mockReset()
  chatState.setMessages.mockReset()
  chatState.status = 'ready'
  chatState.error = undefined
  chatState.clearError.mockReset()
})

describe('ConversationPanelShell', () => {
  it('sends the current analysis and selected activity data with a user message', () => {
    const selectedActivities = [createActivity({ id: 'a' }), createActivity({ id: 'b' })]
    const datasetProfile = buildDatasetProfile(selectedActivities)

    render(
      <ConversationPanelShell
        analysisState={defaultAnalysisState}
        selectedActivities={selectedActivities}
        datasetProfile={datasetProfile}
        selectedActivityCount={selectedActivities.length}
        totalActivityCount={12}
        dataSource="demo"
        onApplyViewSuggestion={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: ' What stands out? ' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage).toHaveBeenCalledWith(
      { text: 'What stands out?' },
      {
        body: {
          currentAnalysisState: defaultAnalysisState,
          selectedActivities,
          datasetProfile,
          selectedActivityCount: selectedActivities.length,
          totalActivityCount: 12,
          dataSource: 'demo',
        },
      },
    )
    expect(screen.getByLabelText('Ask about the current view')).toHaveValue('')
  })

  it('uses a fresh snapshot on a later send after props change', () => {
    const initialActivities = [createActivity({ id: 'a' }), createActivity({ id: 'b' })]
    const nextActivities = [createActivity({ id: 'next', localDate: '2026-05-01' })]
    const nextAnalysisState: AnalysisState = {
      ...defaultAnalysisState,
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'averageSpeedMph',
      },
    }
    const { rerender } = render(
      <ConversationPanelShell
        analysisState={defaultAnalysisState}
        selectedActivities={initialActivities}
        datasetProfile={buildDatasetProfile(initialActivities)}
        selectedActivityCount={initialActivities.length}
        totalActivityCount={12}
        dataSource="demo"
        onApplyViewSuggestion={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'First question' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    rerender(
      <ConversationPanelShell
        analysisState={nextAnalysisState}
        selectedActivities={nextActivities}
        datasetProfile={buildDatasetProfile(nextActivities)}
        selectedActivityCount={nextActivities.length}
        totalActivityCount={20}
        dataSource="strava"
        onApplyViewSuggestion={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Second question' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage).toHaveBeenCalledTimes(2)
    expect(chatState.sendMessage.mock.calls[1][1]).toMatchObject({
      body: {
        currentAnalysisState: nextAnalysisState,
        selectedActivities: nextActivities,
        selectedActivityCount: 1,
        totalActivityCount: 20,
        dataSource: 'strava',
      },
    })
  })

  it('does not send merely because analysis props change', () => {
    const activities = [createActivity({ id: 'a' })]
    const { rerender } = render(
      <ConversationPanelShell
        analysisState={defaultAnalysisState}
        selectedActivities={activities}
        datasetProfile={buildDatasetProfile(activities)}
        selectedActivityCount={activities.length}
        totalActivityCount={12}
        dataSource="demo"
        onApplyViewSuggestion={() => {}}
      />,
    )

    rerender(
      <ConversationPanelShell
        analysisState={{
          ...defaultAnalysisState,
          view: { type: 'cumulative', yMetric: 'distanceMiles', accumulation: 'continuous' },
        }}
        selectedActivities={[]}
        datasetProfile={buildDatasetProfile(activities)}
        selectedActivityCount={0}
        totalActivityCount={12}
        dataSource="demo"
        onApplyViewSuggestion={() => {}}
      />,
    )

    expect(chatState.sendMessage).not.toHaveBeenCalled()
  })

  it('renders user and streamed assistant text parts', () => {
    chatState.messages = [
      createMessage('user-message', 'user', 'Does this look slower?'),
      createMessage('assistant-message', 'assistant', 'The selected activities are sparse.'),
    ]

    render(createPanel())

    expect(screen.getByText('Does this look slower?')).toBeInTheDocument()
    expect(screen.getByText('The selected activities are sparse.')).toBeInTheDocument()
  })

  it('renders assistant markdown for emphasis and lists', () => {
    chatState.messages = [
      createMessage(
        'assistant-message',
        'assistant',
        '**Important** _seasonal_ pattern:\n\n- First item\n- Second item\n\n1. Ordered item\n2. Next ordered item\n\nUse `averageSpeedMph`.',
      ),
    ]

    const { container } = render(createPanel())

    expect(container.querySelector('strong')).toHaveTextContent('Important')
    expect(container.querySelector('em')).toHaveTextContent('seasonal')
    expect(screen.getByText('First item')).toBeInTheDocument()
    expect(screen.getByText('Second item')).toBeInTheDocument()
    expect(screen.getByText('Ordered item')).toBeInTheDocument()
    expect(screen.getByText('Next ordered item')).toBeInTheDocument()
    expect(container.querySelector('code')).toHaveTextContent('averageSpeedMph')
    expect(screen.queryByText(/\*\*Important\*\*/)).not.toBeInTheDocument()
  })

  it('renders assistant safe links and blocks unsafe links', () => {
    chatState.messages = [
      createMessage(
        'assistant-message',
        'assistant',
        '[Docs](https://example.com/docs) [Email](mailto:test@example.com) [Unsafe](javascript:alert(1))',
      ),
    ]

    render(createPanel())

    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    )
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'rel',
      'noreferrer',
    )
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:test@example.com',
    )
    expect(screen.queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument()
    expect(screen.getByText('Unsafe')).toBeInTheDocument()
  })

  it('does not render raw assistant HTML as trusted HTML', () => {
    chatState.messages = [
      createMessage(
        'assistant-message',
        'assistant',
        'Do not trust <button>Injected action</button> markup.',
      ),
    ]

    render(createPanel())

    expect(
      screen.queryByRole('button', { name: 'Injected action' }),
    ).not.toBeInTheDocument()
  })

  it('keeps user markdown as plain text', () => {
    chatState.messages = [
      createMessage('user-message', 'user', '**Do not format my input**'),
    ]

    const { container } = render(createPanel())

    expect(screen.getByText('**Do not format my input**')).toBeInTheDocument()
    expect(container.querySelector('strong')).not.toBeInTheDocument()
  })

  it('renders one minimal tool status for assistant tool activity', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'I checked the selected activities.' },
          {
            type: 'tool-summarizeSelection',
            toolCallId: 'tool-a',
            state: 'output-available',
            input: {},
            output: { activityCount: 3 },
          },
        ],
      } as UIMessage,
    ]

    render(createPanel())

    expect(screen.getByText('I checked the selected activities.')).toBeInTheDocument()
    expect(screen.getByText('Analyzed selection')).toBeInTheDocument()
    expect(screen.queryByText('activityCount')).not.toBeInTheDocument()
  })

  it('renders a validated View Suggestion card without generic tool status', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'This view may help.' },
          createSuggestionToolPart(
            createSuggestion({ label: '**Compare speed and elevation**' }),
          ),
        ],
      } as UIMessage,
    ]

    render(createPanel())

    expect(screen.getByText('This view may help.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'View suggestion' })).toBeInTheDocument()
    expect(screen.getByText('**Compare speed and elevation**')).toBeInTheDocument()
    expect(screen.getByText('Elevation may explain the speed pattern.')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Relationship')).toBeInTheDocument()
    expect(screen.getByText('X metric')).toBeInTheDocument()
    expect(screen.getByText('Elevation gain')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'View suggestion' })).queryByText(
        'Compare speed and elevation',
      ),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeEnabled()
    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()
    expect(screen.queryByText('Suggestion applied')).not.toBeInTheDocument()
    expect(screen.queryByText('Suggestion dismissed')).not.toBeInTheDocument()
    expect(screen.queryByText('Analyzed selection')).not.toBeInTheDocument()
  })

  it('renders assistant suggestion cards after explanatory text even if the tool part arrives first', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [
          createSuggestionToolPart(createSuggestion()),
          { type: 'text', text: 'This relationship view would help.' },
        ],
      } as UIMessage,
    ]

    const { container } = render(createPanel())
    const content = container.querySelector('.conversation-message-content')

    expect(content?.children[0]).toHaveTextContent('This relationship view would help.')
    expect(content?.children[1]).toHaveAccessibleName('View suggestion')
  })

  it('applies a suggestion only through the parent callback', () => {
    const onApplyViewSuggestion = vi.fn()
    const suggestion = createSuggestion()
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]

    render(createPanel({ onApplyViewSuggestion }))

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApplyViewSuggestion).toHaveBeenCalledWith(
      suggestion,
      applyViewSuggestion(defaultAnalysisState, suggestion),
    )
    expect(screen.getByRole('region', { name: 'View suggestion' })).toBeInTheDocument()
    expect(screen.getByText('Compare speed and elevation')).toBeInTheDocument()
    expect(screen.getByText('Elevation may explain the speed pattern.')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Relationship')).toBeInTheDocument()
    expect(screen.getByText('X metric')).toBeInTheDocument()
    expect(screen.getByText('Elevation gain')).toBeInTheDocument()
    expect(screen.getByText('Suggestion applied')).toBeInTheDocument()
    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })

  it('keeps an applied suggestion card from becoming visually stale after state changes', () => {
    const suggestion = createSuggestion()
    const appliedState = applyViewSuggestion(defaultAnalysisState, suggestion)
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]
    const { rerender } = render(createPanel())

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    rerender(createPanel({ analysisState: appliedState }))

    expect(screen.getByRole('region', { name: 'View suggestion' })).toBeInTheDocument()
    expect(screen.getByText('Compare speed and elevation')).toBeInTheDocument()
    expect(screen.getByText('Suggestion applied')).toBeInTheDocument()
    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })

  it('sends applied suggestion context once when the next submit matches the applied state', () => {
    const suggestion = createSuggestion()
    const appliedState = applyViewSuggestion(defaultAnalysisState, suggestion)
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]
    const { rerender } = render(createPanel())

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    rerender(createPanel({ analysisState: appliedState }))
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Ok, what do we see?' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage).toHaveBeenCalledWith(
      { text: 'Ok, what do we see?' },
      expect.objectContaining({
        body: expect.objectContaining({
          recentlyAppliedViewSuggestion: {
            label: suggestion.label,
            changes: suggestion.changes,
            appliedStateFingerprint: getAnalysisStateFingerprint(appliedState),
          },
        }),
      }),
    )

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'And now?' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage.mock.calls[1][1].body).not.toHaveProperty(
      'recentlyAppliedViewSuggestion',
    )
  })

  it('omits and clears applied suggestion context when current state no longer matches', () => {
    const suggestion = createSuggestion()
    const appliedState = applyViewSuggestion(defaultAnalysisState, suggestion)
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]
    const staleState: AnalysisState = {
      ...defaultAnalysisState,
      selection: { ...defaultAnalysisState.selection, years: [2026] },
    }
    const { rerender } = render(createPanel())

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    rerender(createPanel({ analysisState: staleState }))
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'What now?' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage.mock.calls[0][1].body).not.toHaveProperty(
      'recentlyAppliedViewSuggestion',
    )

    rerender(createPanel({ analysisState: appliedState }))
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Try again' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage.mock.calls[1][1].body).not.toHaveProperty(
      'recentlyAppliedViewSuggestion',
    )
  })

  it('applies a suggestion patch to the current state after analysis state changes', () => {
    const onApplyViewSuggestion = vi.fn()
    const suggestion = createSuggestion()
    const currentState: AnalysisState = {
      ...defaultAnalysisState,
      selection: { ...defaultAnalysisState.selection, years: [2026] },
    }
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]

    render(
      createPanel({
        analysisState: currentState,
        onApplyViewSuggestion,
      }),
    )

    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApplyViewSuggestion).toHaveBeenCalledWith(
      suggestion,
      applyViewSuggestion(currentState, suggestion),
    )
  })

  it('keeps a pending suggestion actionable when analysis props change', () => {
    const suggestion = createSuggestion()
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]
    const { rerender } = render(createPanel())

    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()

    rerender(
      createPanel({
        analysisState: {
          ...defaultAnalysisState,
          selection: { ...defaultAnalysisState.selection, years: [2026] },
        },
      }),
    )

    expect(
      screen.queryByText(/Current view or filters changed/),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
  })

  it('dismisses a suggestion without applying it', () => {
    const onApplyViewSuggestion = vi.fn()
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(createSuggestion())],
      } as UIMessage,
    ]

    render(createPanel({ onApplyViewSuggestion }))

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onApplyViewSuggestion).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: 'View suggestion' })).toBeInTheDocument()
    expect(screen.getByText('Compare speed and elevation')).toBeInTheDocument()
    expect(screen.getByText('Elevation may explain the speed pattern.')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Relationship')).toBeInTheDocument()
    expect(screen.getByText('X metric')).toBeInTheDocument()
    expect(screen.getByText('Elevation gain')).toBeInTheDocument()
    expect(screen.getByText('Suggestion dismissed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Current view or filters changed/)).not.toBeInTheDocument()
  })

  it('clears local suggestion status for New Chat', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(createSuggestion())],
      } as UIMessage,
    ]

    render(createPanel())

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByText('Suggestion dismissed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }))

    expect(chatState.setMessages).toHaveBeenCalledWith([])
    expect(screen.queryByText('Suggestion dismissed')).not.toBeInTheDocument()
  })

  it('does not expose malformed suggestion output or allow Apply', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [
          {
            type: 'tool-proposeViewSuggestion',
            toolCallId: 'tool-a',
            state: 'output-available',
            input: {},
            output: {
              rawSecret: 'do-not-render',
            },
          },
        ],
      } as UIMessage,
    ]

    render(createPanel())

    expect(screen.getByText('Suggestion unavailable')).toBeInTheDocument()
    expect(screen.queryByText('do-not-render')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('keeps historical suggestion cards visible after later messages', () => {
    chatState.messages = [
      {
        id: 'assistant-a',
        role: 'assistant',
        parts: [createSuggestionToolPart(createSuggestion())],
      } as UIMessage,
      createMessage('user-message', 'user', 'What about weekends?'),
      createMessage('assistant-b', 'assistant', 'Weekends are more sparse.'),
    ]

    render(createPanel())

    expect(screen.getByText('Compare speed and elevation')).toBeInTheDocument()
    expect(screen.getByText('What about weekends?')).toBeInTheDocument()
    expect(screen.getByText('Weekends are more sparse.')).toBeInTheDocument()
  })

  it('ignores streaming suggestion tool parts until output is available', () => {
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [
          {
            type: 'tool-proposeViewSuggestion',
            toolCallId: 'tool-a',
            state: 'input-available',
            input: {
              label: 'Pending suggestion',
              patch: {
                view: {
                  type: 'trend',
                  yMetric: 'distanceMiles',
                },
              },
            },
          },
        ],
      } as UIMessage,
    ]

    render(createPanel())

    expect(screen.queryByRole('region', { name: 'View suggestion' })).not.toBeInTheDocument()
    expect(screen.queryByText('Suggestion unavailable')).not.toBeInTheDocument()
  })

  it('clears transcript state and composer text for New Chat', () => {
    render(createPanel())

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Draft question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }))

    expect(chatState.setMessages).toHaveBeenCalledWith([])
    expect(chatState.clearError).toHaveBeenCalled()
    expect(screen.getByLabelText('Ask about the current view')).toHaveValue('')
    expect(chatState.sendMessage).not.toHaveBeenCalled()
  })

  it('clears pending applied suggestion context for New Chat', () => {
    const suggestion = createSuggestion()
    const appliedState = applyViewSuggestion(defaultAnalysisState, suggestion)
    chatState.messages = [
      {
        id: 'assistant-message',
        role: 'assistant',
        parts: [createSuggestionToolPart(suggestion)],
      } as UIMessage,
    ]
    const { rerender } = render(createPanel())

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    rerender(createPanel({ analysisState: appliedState }))
    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }))
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Fresh question' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage.mock.calls[0][1].body).not.toHaveProperty(
      'recentlyAppliedViewSuggestion',
    )
  })

  it('shows loading and disables submit while submitted or streaming', () => {
    chatState.status = 'submitted'

    render(createPanel())

    expect(
      screen.getByText('Assistant is analyzing the current selection.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('renders a concise error state', () => {
    chatState.status = 'error'
    chatState.error = new Error('failed')

    render(createPanel())

    expect(
      screen.getByText('The assistant could not respond. Try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('does not send empty input or while not ready', () => {
    const { rerender } = render(createPanel())

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: '   ' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    chatState.status = 'streaming'
    rerender(createPanel())
    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'Now?' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    expect(chatState.sendMessage).not.toHaveBeenCalled()
  })
})

function createPanel(
  overrides: Partial<{
    analysisState: AnalysisState
    selectedActivities: Activity[]
    datasetProfile: DatasetProfile
    selectedActivityCount: number
    totalActivityCount: number
    dataSource: 'demo' | 'strava'
    onApplyViewSuggestion: (
      suggestion: ViewSuggestion,
      nextAnalysisState: AnalysisState,
    ) => void
  }> = {},
) {
  const selectedActivities = overrides.selectedActivities ?? [
    createActivity({ id: 'a' }),
    createActivity({ id: 'b' }),
    createActivity({ id: 'c' }),
  ]

  return (
    <ConversationPanelShell
      analysisState={overrides.analysisState ?? defaultAnalysisState}
      selectedActivities={selectedActivities}
      datasetProfile={overrides.datasetProfile ?? buildDatasetProfile(selectedActivities)}
      selectedActivityCount={overrides.selectedActivityCount ?? selectedActivities.length}
      totalActivityCount={overrides.totalActivityCount ?? selectedActivities.length}
      dataSource={overrides.dataSource ?? 'demo'}
      onApplyViewSuggestion={overrides.onApplyViewSuggestion ?? vi.fn()}
    />
  )
}

function createSuggestion(
  overrides: Partial<ViewSuggestion> = {},
): ViewSuggestion {
  return {
    id: overrides.id ?? 'suggestion-a',
    label: overrides.label ?? 'Compare speed and elevation',
    rationale: overrides.rationale ?? 'Elevation may explain the speed pattern.',
    patch:
      overrides.patch ??
      {
        view: {
          type: 'relationship',
          xMetric: 'elevationGainFeet',
          yMetric: 'averageSpeedMph',
        },
      },
    changes:
      overrides.changes ??
      [
        {
          field: 'view.type',
          action: 'set',
          label: 'View',
          value: 'Relationship',
        },
        {
          field: 'view.xMetric',
          action: 'set',
          label: 'X metric',
          value: 'Elevation gain',
        },
      ],
  }
}

function createSuggestionToolPart(suggestion: ViewSuggestion) {
  return {
    type: 'tool-proposeViewSuggestion',
    toolCallId: `tool-${suggestion.id}`,
    state: 'output-available',
    input: {
      label: suggestion.label,
      patch: {
        view: {
          type: 'relationship',
          xMetric: 'elevationGainFeet',
          yMetric: 'averageSpeedMph',
        },
      },
    },
    output: suggestion,
  }
}

function createMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
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
