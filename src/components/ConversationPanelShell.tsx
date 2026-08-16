export function ConversationPanelShell() {
  return (
    <aside className="conversation-panel" aria-label="AI conversation panel">
      <p className="section-label">AI conversation panel</p>
      <h2>Assistant</h2>
      <div className="conversation-placeholder">
        <p>Conversation transcript placeholder.</p>
        <p>Future messages will use the current analysis state when the user submits a prompt.</p>
      </div>
      <div className="composer-placeholder" aria-label="Prompt composer placeholder">
        Ask about the current view
      </div>
    </aside>
  )
}
