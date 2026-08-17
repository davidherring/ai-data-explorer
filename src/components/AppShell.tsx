import { useMemo, useState } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import { ConversationPanelShell } from './ConversationPanelShell.tsx'
import { RideDataSourceControl } from './RideDataSourceControl.tsx'
import { StravaConnectionControl } from './StravaConnectionControl.tsx'
import { filterRides } from '../analysis/filterRides.ts'
import { useRideDataSource } from '../hooks/useRideDataSource.ts'
import {
  defaultAnalysisState,
  type AnalysisState,
} from '../state/analysisState.ts'

export function AppShell() {
  const rideDataSource = useRideDataSource()
  const [analysisState, setAnalysisState] =
    useState<AnalysisState>(defaultAnalysisState)

  const selectedRides = useMemo(
    () => filterRides(rideDataSource.rides, analysisState.selection),
    [rideDataSource.rides, analysisState.selection],
  )

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
        <AnalysisWorkspaceShell
          rides={rideDataSource.rides}
          selectedRides={selectedRides}
          analysisState={analysisState}
          onAnalysisStateChange={setAnalysisState}
        />
        <ConversationPanelShell />
      </section>

      <section className="status-strip" aria-label="Summary and status">
        <RideDataSourceControl
          source={rideDataSource.source}
          status={rideDataSource.status}
          rideCount={rideDataSource.rides.length}
          metadata={rideDataSource.metadata}
          error={rideDataSource.error}
          onSourceChange={rideDataSource.setSource}
          onRefresh={() => {
            void rideDataSource.refresh()
          }}
        />
        <span>
          Selection: {selectedRides.length} of {rideDataSource.rides.length} rides
        </span>
        <span>View: {analysisState.view.type}</span>
        <span>Deployment readiness: local shell</span>
      </section>
    </main>
  )
}
