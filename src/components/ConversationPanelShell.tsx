import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useMemo, useState, type FormEvent } from 'react'
import Markdown, { type Components } from 'react-markdown'
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
type RecentlyAppliedViewSuggestion = {
  label: string
  changes: ViewSuggestion['changes']
  appliedStateFingerprint: string
}

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
  const [recentlyAppliedViewSuggestion, setRecentlyAppliedViewSuggestion] =
    useState<RecentlyAppliedViewSuggestion | undefined>(undefined)
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

    const currentStateFingerprint = getAnalysisStateFingerprint(analysisState)
    const activeAppliedSuggestion =
      recentlyAppliedViewSuggestion?.appliedStateFingerprint ===
      currentStateFingerprint
        ? recentlyAppliedViewSuggestion
        : undefined

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
          ...(activeAppliedSuggestion !== undefined
            ? { recentlyAppliedViewSuggestion: activeAppliedSuggestion }
            : {}),
        },
      },
    )
    setComposerText('')
    setRecentlyAppliedViewSuggestion(undefined)
  }

  function handleNewChat() {
    setMessages([])
    setComposerText('')
    setSuggestionStatuses({})
    setRecentlyAppliedViewSuggestion(undefined)
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
    setRecentlyAppliedViewSuggestion({
      label: suggestion.label,
      changes: suggestion.changes,
      appliedStateFingerprint: getAnalysisStateFingerprint(suggestion.proposedState),
    })
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
  const textParts = message.parts.filter((part) => part.type === 'text')
  const suggestionParts =
    message.role === 'assistant'
      ? message.parts.filter((part) => part.type === 'tool-proposeViewSuggestion')
      : []
  const roleLabel = message.role === 'user' ? 'You' : 'Assistant'

  return (
    <article className={`conversation-message conversation-message-${message.role}`}>
      <p className="conversation-message-role">{roleLabel}</p>
      <div className="conversation-message-content">
        {textParts.map((part, index) => {
          if (message.role === 'assistant') {
            return (
              <AssistantMarkdown key={`${message.id}-text-${index}`}>
                {part.text}
              </AssistantMarkdown>
            )
          }

          return <p key={`${message.id}-text-${index}`}>{part.text}</p>
        })}
        {message.role === 'assistant' && hasAnalyticalToolActivity && (
          <p className="conversation-tool-status">Analyzed selection</p>
        )}
        {suggestionParts.map((part, index) => (
          <ViewSuggestionToolPart
            key={`${message.id}-suggestion-${index}`}
            part={part}
            analysisState={analysisState}
            statusBySuggestionId={suggestionStatuses}
            onApply={onApplySuggestion}
            onDismiss={onDismissSuggestion}
          />
        ))}
      </div>
    </article>
  )
}

const assistantMarkdownComponents: Components = {
  a({ href, children }) {
    if (!isSafeMarkdownLink(href)) {
      return <span>{children}</span>
    }

    const opensExternally =
      href.startsWith('http://') || href.startsWith('https://')

    return (
      <a
        href={href}
        rel={opensExternally ? 'noreferrer' : undefined}
        target={opensExternally ? '_blank' : undefined}
      >
        {children}
      </a>
    )
  },
}

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="conversation-markdown">
      <Markdown
        allowedElements={['p', 'strong', 'em', 'ol', 'ul', 'li', 'code', 'a']}
        components={assistantMarkdownComponents}
        unwrapDisallowed
        urlTransform={(url) => url}
      >
        {children}
      </Markdown>
    </div>
  )
}

function isSafeMarkdownLink(href: string | undefined): href is string {
  if (href === undefined) {
    return false
  }

  try {
    const parsedUrl = new URL(href)

    return ['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)
  } catch {
    return false
  }
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
