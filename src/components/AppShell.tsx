import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import { ConversationPanelShell } from './ConversationPanelShell.tsx'
import { StravaConnectionControl } from './StravaConnectionControl.tsx'

export function AppShell() {
  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Application header">
        <div>
          <p className="eyebrow">Strava cycling analysis</p>
          <h1>Interactive AI Data Explorer</h1>
        </div>
        <div className="header-actions">
          <StravaConnectionControl />
          <p className="phase-label">Sprint 2 OAuth</p>
        </div>
      </header>

      <section className="workspace-layout" aria-label="Analysis workspace shell">
        <AnalysisWorkspaceShell />
        <ConversationPanelShell />
      </section>

      <section className="status-strip" aria-label="Summary and status">
        <span>Dataset status: placeholder</span>
        <span>Analysis state: placeholder</span>
        <span>Deployment readiness: local shell</span>
      </section>
    </main>
  )
}
