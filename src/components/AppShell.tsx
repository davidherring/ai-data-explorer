import { useMemo, useState } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import { ConversationPanelShell } from './ConversationPanelShell.tsx'
import { ActivityDataSourceControl } from './ActivityDataSourceControl.tsx'
import { StravaConnectionControl } from './StravaConnectionControl.tsx'
import { buildDatasetProfile } from '../analysis/aiContext.ts'
import { filterActivities } from '../analysis/filterActivities.ts'
import { useActivityDataSource } from '../hooks/useActivityDataSource.ts'
import {
  defaultAnalysisState,
  type AnalysisState,
} from '../state/analysisState.ts'
import type { ViewSuggestion } from '../state/viewSuggestions.ts'

export function AppShell() {
  const activityDataSource = useActivityDataSource()
  const [analysisState, setAnalysisState] =
    useState<AnalysisState>(defaultAnalysisState)

  const selectedActivities = useMemo(
    () => filterActivities(activityDataSource.activities, analysisState.selection),
    [activityDataSource.activities, analysisState.selection],
  )
  const datasetProfile = useMemo(
    () => buildDatasetProfile(activityDataSource.activities),
    [activityDataSource.activities],
  )

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Application header">
        <div>
          <p className="eyebrow">Strava activity analysis</p>
          <h1>Interactive AI Data Explorer</h1>
        </div>
        <div className="header-actions">
          <StravaConnectionControl />
        </div>
      </header>

      <section className="workspace-layout" aria-label="Analysis workspace shell">
        <AnalysisWorkspaceShell
          activities={activityDataSource.activities}
          selectedActivities={selectedActivities}
          analysisState={analysisState}
          onAnalysisStateChange={setAnalysisState}
        />
        <ConversationPanelShell
          analysisState={analysisState}
          selectedActivities={selectedActivities}
          datasetProfile={datasetProfile}
          selectedActivityCount={selectedActivities.length}
          totalActivityCount={activityDataSource.activities.length}
          dataSource={activityDataSource.source}
          onApplyViewSuggestion={(suggestion: ViewSuggestion) => {
            setAnalysisState(suggestion.proposedState)
          }}
        />
      </section>

      <section className="status-strip" aria-label="Summary and status">
        <ActivityDataSourceControl
          source={activityDataSource.source}
          status={activityDataSource.status}
          activityCount={activityDataSource.activities.length}
          metadata={activityDataSource.metadata}
          error={activityDataSource.error}
          onSourceChange={activityDataSource.setSource}
          onRefresh={() => {
            void activityDataSource.refresh()
          }}
        />
        <span>View: {analysisState.view.type}</span>
      </section>
    </main>
  )
}
