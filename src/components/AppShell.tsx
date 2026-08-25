import { useEffect, useMemo, useRef, useState } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import { ConversationPanelShell } from './ConversationPanelShell.tsx'
import { ActivityDataSourceControl } from './ActivityDataSourceControl.tsx'
import { StravaConnectionControl } from './StravaConnectionControl.tsx'
import { buildDatasetProfile } from '../analysis/aiContext.ts'
import { filterActivities } from '../analysis/filterActivities.ts'
import { useActivityDataSource } from '../hooks/useActivityDataSource.ts'
import type { ActivityDataSourceId } from '../data/activityDataSource.ts'
import {
  defaultAnalysisState,
  type AnalysisState,
} from '../state/analysisState.ts'
import {
  areNumberArraysEqual,
  reconcileSelectedYears,
  sortYearsAscending,
} from '../state/yearSelection.ts'
import {
  buildActivityDataContextId,
  type ViewSuggestion,
} from '../state/viewSuggestions.ts'

type ReadySourceSnapshot = {
  source: ActivityDataSourceId
  availableYears: number[]
}

export function AppShell() {
  const activityDataSource = useActivityDataSource()
  const [analysisState, setAnalysisState] =
    useState<AnalysisState>(defaultAnalysisState)
  const previousReadySource = useRef<ReadySourceSnapshot | undefined>(undefined)
  const availableYears = useMemo(
    () => getAvailableYears(activityDataSource.activities),
    [activityDataSource.activities],
  )

  useEffect(() => {
    if (activityDataSource.status !== 'ready') {
      return
    }

    const previous = previousReadySource.current

    setAnalysisState((current) => {
      const years = reconcileSelectedYears({
        availableYears,
        previousAvailableYears: previous?.availableYears,
        previousSource: previous?.source,
        selectedYears: current.selection.years,
        source: activityDataSource.source,
      })

      if (areNumberArraysEqual(years, current.selection.years)) {
        return current
      }

      return {
        ...current,
        selection: {
          ...current.selection,
          years,
        },
      }
    })

    previousReadySource.current = {
      source: activityDataSource.source,
      availableYears,
    }
  }, [activityDataSource.source, activityDataSource.status, availableYears])

  const selectedActivities = useMemo(
    () => filterActivities(activityDataSource.activities, analysisState.selection),
    [activityDataSource.activities, analysisState.selection],
  )
  const datasetProfile = useMemo(
    () => buildDatasetProfile(activityDataSource.activities),
    [activityDataSource.activities],
  )
  const activityDataContextId = useMemo(
    () =>
      buildActivityDataContextId(
        activityDataSource.source,
        activityDataSource.activities,
      ),
    [activityDataSource.activities, activityDataSource.source],
  )

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Application header">
        <div>
          <p className="eyebrow">Strava activity analysis</p>
          <h1>Interactive AI Data Explorer</h1>
        </div>
        <div className="header-actions">
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
          activityDataContextId={activityDataContextId}
          onApplyViewSuggestion={(
            _suggestion: ViewSuggestion,
            nextAnalysisState: AnalysisState,
          ) => {
            setAnalysisState(nextAnalysisState)
          }}
        />
      </section>

      <section className="status-strip" aria-label="Summary and status">
        <span>View: {analysisState.view.type}</span>
      </section>
    </main>
  )
}

function getAvailableYears(activities: readonly { year: number }[]): number[] {
  return sortYearsAscending(Array.from(new Set(activities.map((activity) => activity.year))))
}
