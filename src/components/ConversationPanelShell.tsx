import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useMemo, useState, type FormEvent } from 'react'
import type { DatasetProfile } from '../analysis/aiContext.ts'
import type { RideDataSourceId } from '../data/rideDataSource.ts'
import type { Ride } from '../data/ride.ts'
import type { AnalysisState } from '../state/analysisState.ts'

type ConversationPanelShellProps = {
  analysisState: AnalysisState
  selectedRides: Ride[]
  datasetProfile: DatasetProfile
  selectedRideCount: number
  totalRideCount: number
  dataSource: RideDataSourceId
}

export function ConversationPanelShell({
  analysisState,
  selectedRides,
  datasetProfile,
  selectedRideCount,
  totalRideCount,
  dataSource,
}: ConversationPanelShellProps) {
  const [composerText, setComposerText] = useState('')
  const transport = useMemo(
    () => new DefaultChatTransport<UIMessage>({ api: '/api/chat' }),
    [],
  )
  const { messages, sendMessage, setMessages, status, error, clearError } =
    useChat({
      transport,
    })
  const isWorking = status === 'submitted' || status === 'streaming'
  const canSubmit = status === 'ready' && composerText.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = composerText.trim()

    if (text.length === 0 || status !== 'ready') {
      return
    }

    void sendMessage(
      { text },
      {
        body: {
          currentAnalysisState: analysisState,
          selectedRides,
          datasetProfile,
          selectedRideCount,
          totalRideCount,
          dataSource,
        },
      },
    )
    setComposerText('')
  }

  function handleNewChat() {
    setMessages([])
    setComposerText('')
    clearError()
  }

  return (
    <aside className="conversation-panel" aria-label="AI conversation panel">
      <div className="conversation-panel-header">
        <div>
          <p className="section-label">AI conversation panel</p>
          <h2>Assistant</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={handleNewChat}
        >
          New Chat
        </button>
      </div>

      <div className="conversation-messages" aria-label="Conversation messages">
        {messages.length === 0 && (
          <p className="conversation-empty">
            Ask about the current selection or view.
          </p>
        )}
        {messages.map((message) => (
          <ConversationMessage key={message.id} message={message} />
        ))}
      </div>

      <div className="conversation-status" aria-live="polite">
        {isWorking && 'Assistant is analyzing the current selection.'}
        {error && (
          <span className="conversation-error">
            The assistant could not respond. Try again.
          </span>
        )}
      </div>

      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label className="conversation-input-label">
          <span className="sr-only">Ask about the current view</span>
          <textarea
            className="conversation-input"
            value={composerText}
            rows={3}
            placeholder="Ask about the current view"
            disabled={status !== 'ready'}
            onChange={(event) => {
              setComposerText(event.currentTarget.value)
            }}
          />
        </label>
        <button className="secondary-button" type="submit" disabled={!canSubmit}>
          Send
        </button>
      </form>
    </aside>
  )
}

function ConversationMessage({ message }: { message: UIMessage }) {
  const hasToolActivity = message.parts.some((part) => isToolUIPart(part))
  const roleLabel = message.role === 'user' ? 'You' : 'Assistant'

  return (
    <article className={`conversation-message conversation-message-${message.role}`}>
      <p className="conversation-message-role">{roleLabel}</p>
      <div className="conversation-message-content">
        {message.parts.map((part, index) => {
          if (part.type !== 'text') {
            return null
          }

          return <p key={`${message.id}-${index}`}>{part.text}</p>
        })}
        {message.role === 'assistant' && hasToolActivity && (
          <p className="conversation-tool-status">Analyzed selection</p>
        )}
      </div>
    </article>
  )
}
