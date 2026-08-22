import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { UIMessage } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDatasetProfile, type DatasetProfile } from '../analysis/aiContext.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  defaultAnalysisState,
  type AnalysisState,
} from '../state/analysisState.ts'
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
    const initialRides = [createActivity({ id: 'a' }), createActivity({ id: 'b' })]
    const nextRides = [createActivity({ id: 'next', localDate: '2026-05-01' })]
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
        selectedActivities={initialRides}
        datasetProfile={buildDatasetProfile(initialRides)}
        selectedActivityCount={initialRides.length}
        totalActivityCount={12}
        dataSource="demo"
      />,
    )

    fireEvent.change(screen.getByLabelText('Ask about the current view'), {
      target: { value: 'First question' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!)

    rerender(
      <ConversationPanelShell
        analysisState={nextAnalysisState}
        selectedActivities={nextRides}
        datasetProfile={buildDatasetProfile(nextRides)}
        selectedActivityCount={nextRides.length}
        totalActivityCount={20}
        dataSource="strava"
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
        selectedActivities: nextRides,
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
    />
  )
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
