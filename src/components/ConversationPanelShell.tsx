import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { DatasetProfile } from '../analysis/aiContext.ts'
import type { ActivityDataSourceId } from '../data/activityDataSource.ts'
import type { Activity } from '../data/activity.ts'
import type { AnalysisState } from '../state/analysisState.ts'
import {
  applyViewSuggestion,
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
  activityDataContextId: string
  onApplyViewSuggestion: (
    suggestion: ViewSuggestion,
    nextAnalysisState: AnalysisState,
  ) => void
}

type SuggestionStatus = 'applied' | 'dismissed' | 'ignored'
type AppliedViewSuggestionContext = {
  trigger: 'automatic-post-apply-analysis'
  status: 'applied-successfully'
  label: string
  changes: ViewSuggestion['changes']
}
type PendingAutoFollowUp = {
  suggestionId: string
  targetStateFingerprint: string
  activityDataContextId: string
  context: AppliedViewSuggestionContext
}

export function ConversationPanelShell({
  analysisState,
  selectedActivities,
  datasetProfile,
  selectedActivityCount,
  totalActivityCount,
  dataSource,
  activityDataContextId,
  onApplyViewSuggestion,
}: ConversationPanelShellProps) {
  const [composerText, setComposerText] = useState('')
  const [suggestionStatuses, setSuggestionStatuses] = useState<
    Record<string, SuggestionStatus>
  >({})
  const [unavailableSuggestionIds, setUnavailableSuggestionIds] = useState<
    Record<string, true>
  >({})
  const [pendingAutoFollowUp, setPendingAutoFollowUp] =
    useState<PendingAutoFollowUp | undefined>(undefined)
  const previousActivityDataContextId = useRef(activityDataContextId)
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

  const buildChatRequestBody = useCallback(
    (options: { appliedViewSuggestionContext?: AppliedViewSuggestionContext } = {}) => ({
      currentAnalysisState: analysisState,
      selectedActivities,
      datasetProfile,
      selectedActivityCount,
      totalActivityCount,
      dataSource,
      ...(options.appliedViewSuggestionContext !== undefined
        ? { appliedViewSuggestionContext: options.appliedViewSuggestionContext }
        : {}),
    }),
    [
      analysisState,
      dataSource,
      datasetProfile,
      selectedActivities,
      selectedActivityCount,
      totalActivityCount,
    ],
  )

  const markPendingSuggestionsAsIgnored = useCallback(() => {
    const suggestions = getValidViewSuggestions(messages)

    if (suggestions.length === 0) {
      return
    }

    setSuggestionStatuses((current) => {
      let next = current

      for (const suggestion of suggestions) {
        if (
          current[suggestion.id] === undefined &&
          unavailableSuggestionIds[suggestion.id] !== true
        ) {
          if (next === current) {
            next = { ...current }
          }

          next[suggestion.id] = 'ignored'
        }
      }

      return next
    })
  }, [messages, unavailableSuggestionIds])

  useEffect(() => {
    if (previousActivityDataContextId.current === activityDataContextId) {
      return
    }

    previousActivityDataContextId.current = activityDataContextId
    markPendingSuggestionsAsIgnored()
  }, [activityDataContextId, markPendingSuggestionsAsIgnored])

  useEffect(() => {
    if (pendingAutoFollowUp === undefined) {
      return
    }

    if (pendingAutoFollowUp.activityDataContextId !== activityDataContextId) {
      setPendingAutoFollowUp(undefined)
      return
    }

    if (status !== 'ready') {
      return
    }

    if (
      getAnalysisStateFingerprint(analysisState) !==
      pendingAutoFollowUp.targetStateFingerprint
    ) {
      return
    }

    const followUp = pendingAutoFollowUp
    setPendingAutoFollowUp(undefined)

    void sendMessage(
      {
        id: `automatic-post-apply-${followUp.suggestionId}`,
        role: 'user',
        parts: [],
        metadata: {
          internalTrigger: 'automatic-post-apply-analysis',
        },
      } as UIMessage,
      {
        body: buildChatRequestBody({
          appliedViewSuggestionContext: followUp.context,
        }),
      },
    )
  }, [
    activityDataContextId,
    analysisState,
    buildChatRequestBody,
    pendingAutoFollowUp,
    sendMessage,
    status,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = composerText.trim()

    if (text.length === 0 || status !== 'ready') {
      return
    }

    markPendingSuggestionsAsIgnored()

    void sendMessage(
      { text },
      {
        body: buildChatRequestBody(),
      },
    )
    setComposerText('')
    setPendingAutoFollowUp(undefined)
  }

  function handleNewChat() {
    setMessages([])
    setComposerText('')
    setSuggestionStatuses({})
    setUnavailableSuggestionIds({})
    setPendingAutoFollowUp(undefined)
    clearError()
  }

  function handleApplySuggestion(suggestion: ViewSuggestion) {
    let nextAnalysisState: AnalysisState

    try {
      nextAnalysisState = applyViewSuggestion(analysisState, suggestion)
    } catch {
      setUnavailableSuggestionIds((current) => ({
        ...current,
        [suggestion.id]: true,
      }))
      return
    }

    onApplyViewSuggestion(suggestion, nextAnalysisState)
    setPendingAutoFollowUp({
      suggestionId: suggestion.id,
      targetStateFingerprint: getAnalysisStateFingerprint(nextAnalysisState),
      activityDataContextId,
      context: {
        trigger: 'automatic-post-apply-analysis',
        status: 'applied-successfully',
        label: suggestion.label,
        changes: suggestion.changes,
      },
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
        {messages.filter((message) => !isHiddenAutomaticFollowUpMessage(message))
          .length === 0 && (
          <p className="conversation-empty">
            Ask about the current selection or view.
          </p>
        )}
        {messages
          .filter((message) => !isHiddenAutomaticFollowUpMessage(message))
          .map((message) => (
          <ConversationMessage
            key={message.id}
            message={message}
            suggestionStatuses={suggestionStatuses}
            unavailableSuggestionIds={unavailableSuggestionIds}
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

function isHiddenAutomaticFollowUpMessage(message: UIMessage): boolean {
  if (message.role !== 'user') {
    return false
  }

  const metadata = message.metadata

  return (
    metadata !== null &&
    typeof metadata === 'object' &&
    'internalTrigger' in metadata &&
    metadata.internalTrigger === 'automatic-post-apply-analysis'
  )
}

function ConversationMessage({
  message,
  suggestionStatuses,
  unavailableSuggestionIds,
  onApplySuggestion,
  onDismissSuggestion,
}: {
  message: UIMessage
  suggestionStatuses: Record<string, SuggestionStatus>
  unavailableSuggestionIds: Record<string, true>
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
            statusBySuggestionId={suggestionStatuses}
            unavailableSuggestionIds={unavailableSuggestionIds}
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
  table({ children }) {
    return (
      <div className="conversation-markdown-table-scroll">
        <table>{children}</table>
      </div>
    )
  },
}

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="conversation-markdown">
      <Markdown
        allowedElements={[
          'p',
          'strong',
          'em',
          'ol',
          'ul',
          'li',
          'code',
          'a',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ]}
        components={assistantMarkdownComponents}
        remarkPlugins={[remarkGfm]}
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
  statusBySuggestionId: Record<string, SuggestionStatus>
  unavailableSuggestionIds: Record<string, true>
  onApply: (suggestion: ViewSuggestion) => void
  onDismiss: (suggestion: ViewSuggestion) => void
}

function ViewSuggestionToolPart({
  part,
  statusBySuggestionId,
  unavailableSuggestionIds,
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

  const isApplied = status === 'applied'
  const isDismissed = status === 'dismissed'
  const isIgnored = status === 'ignored'
  const isUnavailable = unavailableSuggestionIds[suggestion.id] === true
  const isTerminal = isApplied || isDismissed || isIgnored || isUnavailable

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

      {isTerminal ? (
        <p className="conversation-suggestion-status">
          {getSuggestionTerminalStatusText(status, isUnavailable)}
        </p>
      ) : (
        <div className="conversation-suggestion-actions">
          <button
            className="secondary-button"
            type="button"
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
      )}
    </section>
  )
}

function getSuggestionTerminalStatusText(
  status: SuggestionStatus | undefined,
  isUnavailable: boolean,
): string {
  if (isUnavailable) {
    return 'Suggestion unavailable'
  }

  switch (status) {
    case 'applied':
      return 'Suggestion applied'
    case 'dismissed':
      return 'Suggestion dismissed'
    case 'ignored':
      return 'Suggestion ignored'
    default:
      return 'Suggestion unavailable'
  }
}

function getValidViewSuggestions(messages: readonly UIMessage[]): ViewSuggestion[] {
  const suggestions: ViewSuggestion[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue
    }

    for (const part of message.parts) {
      if (part.type !== 'tool-proposeViewSuggestion') {
        continue
      }

      if (!('state' in part) || part.state !== 'output-available') {
        continue
      }

      const parsedSuggestion = viewSuggestionSchema.safeParse(part.output)

      if (parsedSuggestion.success) {
        suggestions.push(parsedSuggestion.data)
      }
    }
  }

  return suggestions
}
