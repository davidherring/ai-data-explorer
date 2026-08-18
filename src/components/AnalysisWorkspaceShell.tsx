import { useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import { AnalysisViewSwitcher } from './AnalysisViewSwitcher.tsx'
import { MetricTrendChart } from './MetricTrendChart.tsx'
import { MetricViewControls } from './MetricViewControls.tsx'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'
import type { Ride } from '../data/ride.ts'
import {
  defaultRelationshipView,
  defaultTrendView,
  type AnalysisState,
} from '../state/analysisState.ts'

type AnalysisWorkspaceShellProps = {
  rides: Ride[]
  selectedRides: Ride[]
  analysisState: AnalysisState
  onAnalysisStateChange: Dispatch<SetStateAction<AnalysisState>>
}

export function AnalysisWorkspaceShell({
  rides,
  selectedRides,
  analysisState,
  onAnalysisStateChange,
}: AnalysisWorkspaceShellProps) {
  const relationshipView =
    analysisState.view.type === 'relationship'
      ? analysisState.view
      : defaultRelationshipView
  const relationshipPoints = useMemo(
    () =>
      getMetricRelationshipPoints(
        selectedRides,
        relationshipView.xMetric,
        relationshipView.yMetric,
      ),
    [relationshipView.xMetric, relationshipView.yMetric, selectedRides],
  )
  const relationship = useMemo(
    () =>
      relationshipBetweenMetrics(
        selectedRides,
        relationshipView.xMetric,
        relationshipView.yMetric,
      ),
    [relationshipView.xMetric, relationshipView.yMetric, selectedRides],
  )
  const activeView = analysisState.view.type
  const viewSwitcher = (
    <AnalysisViewSwitcher
      activeView={activeView === 'relationship' ? 'relationship' : 'trend'}
      onViewChange={(view) => {
        onAnalysisStateChange((current) => ({
          ...current,
          view:
            view === 'relationship'
              ? { ...defaultRelationshipView }
              : { ...defaultTrendView },
        }))
      }}
    />
  )
  const metricControls =
    activeView === 'trend' || activeView === 'relationship' ? (
      <MetricViewControls
        rides={rides}
        view={analysisState.view}
        onViewChange={(view) => {
          onAnalysisStateChange((current) => ({
            ...current,
            view,
          }))
        }}
      />
    ) : null
  const headerControls = (
    <div className="chart-header-controls">
      {viewSwitcher}
      {metricControls}
    </div>
  )

  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      {activeView === 'trend' && (
        <MetricTrendChart
          rides={selectedRides}
          totalRideCount={rides.length}
          yMetric={analysisState.view.yMetric}
          headerControls={headerControls}
        />
      )}

      {activeView === 'relationship' && (
        <RelationshipScatterChart
          rides={selectedRides}
          totalRideCount={rides.length}
          relationship={relationship}
          points={relationshipPoints}
          headerControls={headerControls}
        />
      )}

      {(activeView === 'seasonal' || activeView === 'cumulative') && (
        <div className="trend-chart" role="status">
          <div className="chart-empty-state">
            This view is not implemented yet.
          </div>
        </div>
      )}

      <div className="controls-placeholder">
        <p className="section-label">Selection / analysis controls</p>
        <ActivitySelectionControls
          rides={rides}
          selection={analysisState.selection}
          onSelectionChange={(selection) => {
            onAnalysisStateChange((current) => ({
              ...current,
              selection,
            }))
          }}
        />
      </div>
    </section>
  )
}
