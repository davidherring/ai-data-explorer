import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useMemo, useState, type FormEvent } from 'react'
import type { DatasetProfile } from '../analysis/aiContext.ts'
import type { ActivityDataSourceId } from '../data/activityDataSource.ts'
import type { Activity } from '../data/activity.ts'
import type { AnalysisState } from '../state/analysisState.ts'
import {
  getAnalysisStateFingerprint,
  viewSuggestionSchema,
  type ViewSuggestion,
} from '../state/viewSuggestions.ts'

type ConversationPanelShellProps = {
  analysisState: AnalysisState
  selectedActivities: Activity[]
  datasetProfile: DatasetProfile
  selectedActivityCount: number
  totalActivityCount: number
  dataSource: ActivityDataSourceId
  onApplyViewSuggestion: (suggestion: ViewSuggestion) => void
}

type SuggestionStatus = 'applied' | 'dismissed'

export function ConversationPanelShell({
  analysisState,
  selectedActivities,
  datasetProfile,
  selectedActivityCount,
  totalActivityCount,
  dataSource,
  onApplyViewSuggestion,
}: ConversationPanelShellProps) {
  const [composerText, setComposerText] = useState('')
  const [suggestionStatuses, setSuggestionStatuses] = useState<
    Record<string, SuggestionStatus>
  >({})
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
          selectedActivities,
          datasetProfile,
          selectedActivityCount,
          totalActivityCount,
          dataSource,
        },
      },
    )
    setComposerText('')
  }

  function handleNewChat() {
    setMessages([])
    setComposerText('')
    setSuggestionStatuses({})
    clearError()
  }

  function handleApplySuggestion(suggestion: ViewSuggestion) {
    if (
      getAnalysisStateFingerprint(analysisState) !==
      suggestion.sourceStateFingerprint
    ) {
      return
    }

    onApplyViewSuggestion(suggestion)
    setSuggestionStatuses((current) => ({
      ...current,
      [suggestion.id]: 'applied',
    }))
  }

  function handleDismissSuggestion(suggestion: ViewSuggestion) {
    setSuggestionStatuses((current) => ({
      ...current,
      [suggestion.id]: 'dismissed',
    }))
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
          <ConversationMessage
            key={message.id}
            message={message}
            analysisState={analysisState}
            suggestionStatuses={suggestionStatuses}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
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

function ConversationMessage({
  message,
  analysisState,
  suggestionStatuses,
  onApplySuggestion,
  onDismissSuggestion,
}: {
  message: UIMessage
  analysisState: AnalysisState
  suggestionStatuses: Record<string, SuggestionStatus>
  onApplySuggestion: (suggestion: ViewSuggestion) => void
  onDismissSuggestion: (suggestion: ViewSuggestion) => void
}) {
  const hasAnalyticalToolActivity = message.parts.some(
    (part) => isToolUIPart(part) && part.type !== 'tool-proposeViewSuggestion',
  )
  const roleLabel = message.role === 'user' ? 'You' : 'Assistant'

  return (
    <article className={`conversation-message conversation-message-${message.role}`}>
      <p className="conversation-message-role">{roleLabel}</p>
      <div className="conversation-message-content">
        {message.parts.map((part, index) => {
          if (part.type !== 'text') {
            if (part.type === 'tool-proposeViewSuggestion') {
              return (
                <ViewSuggestionToolPart
                  key={`${message.id}-${index}`}
                  part={part}
                  analysisState={analysisState}
                  statusBySuggestionId={suggestionStatuses}
                  onApply={onApplySuggestion}
                  onDismiss={onDismissSuggestion}
                />
              )
            }

            return null
          }

          return <p key={`${message.id}-${index}`}>{part.text}</p>
        })}
        {message.role === 'assistant' && hasAnalyticalToolActivity && (
          <p className="conversation-tool-status">Analyzed selection</p>
        )}
      </div>
    </article>
  )
}

type ViewSuggestionToolPartProps = {
  part: UIMessage['parts'][number]
  analysisState: AnalysisState
  statusBySuggestionId: Record<string, SuggestionStatus>
  onApply: (suggestion: ViewSuggestion) => void
  onDismiss: (suggestion: ViewSuggestion) => void
}

function ViewSuggestionToolPart({
  part,
  analysisState,
  statusBySuggestionId,
  onApply,
  onDismiss,
}: ViewSuggestionToolPartProps) {
  if (!('state' in part) || part.state !== 'output-available') {
    return null
  }

  const parsedSuggestion = viewSuggestionSchema.safeParse(part.output)

  if (!parsedSuggestion.success) {
    return (
      <p className="conversation-suggestion-status">Suggestion unavailable</p>
    )
  }

  const suggestion = parsedSuggestion.data
  const status = statusBySuggestionId[suggestion.id]

  if (status === 'dismissed') {
    return (
      <p className="conversation-suggestion-status">Suggestion dismissed</p>
    )
  }

  const isStale =
    getAnalysisStateFingerprint(analysisState) !== suggestion.sourceStateFingerprint
  const isApplied = status === 'applied'
  const applyDisabled = isStale || isApplied

  return (
    <section className="conversation-suggestion-card" aria-label="View suggestion">
      <div>
        <p className="conversation-suggestion-title">{suggestion.label}</p>
        {suggestion.rationale !== undefined && (
          <p className="conversation-suggestion-rationale">
            {suggestion.rationale}
          </p>
        )}
      </div>

      <ul className="conversation-suggestion-changes">
        {suggestion.changes.map((change) => (
          <li key={`${suggestion.id}-${change.field}`}>
            <span>{change.label}</span>
            <span>
              {change.action === 'clear'
                ? 'Clear'
                : change.value ?? 'Set'}
            </span>
          </li>
        ))}
      </ul>

      {isStale && (
        <p className="conversation-suggestion-status">
          Current view or filters changed. Ask for a new suggestion.
        </p>
      )}
      {isApplied && (
        <p className="conversation-suggestion-status">Suggestion applied</p>
      )}

      <div className="conversation-suggestion-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={applyDisabled}
          onClick={() => {
            onApply(suggestion)
          }}
        >
          Apply
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            onDismiss(suggestion)
          }}
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}
