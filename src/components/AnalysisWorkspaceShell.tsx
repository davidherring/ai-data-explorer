import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { buildCumulativeMetricPoints } from '../analysis/cumulativeMetrics.ts'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import { buildSeasonalMetricBuckets } from '../analysis/seasonalMetrics.ts'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import { AnalysisViewSwitcher } from './AnalysisViewSwitcher.tsx'
import { CumulativeMetricChart } from './CumulativeMetricChart.tsx'
import { MetricTrendChart } from './MetricTrendChart.tsx'
import { MetricViewControls } from './MetricViewControls.tsx'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'
import { SeasonalMetricChart } from './SeasonalMetricChart.tsx'
import type { Ride } from '../data/ride.ts'
import {
  defaultRelationshipView,
  defaultCumulativeView,
  defaultSeasonalView,
  defaultTrendView,
  type AnalysisState,
  type ViewType,
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
  const seasonalView =
    analysisState.view.type === 'seasonal'
      ? analysisState.view
      : defaultSeasonalView
  const cumulativeView =
    analysisState.view.type === 'cumulative'
      ? analysisState.view
      : defaultCumulativeView
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
  const seasonalBuckets = useMemo(
    () => buildSeasonalMetricBuckets(selectedRides, seasonalView.yMetric),
    [seasonalView.yMetric, selectedRides],
  )
  const cumulativePoints = useMemo(
    () => buildCumulativeMetricPoints(selectedRides, cumulativeView.yMetric),
    [cumulativeView.yMetric, selectedRides],
  )
  const activeView = analysisState.view.type
  const viewSwitcher = (
    <AnalysisViewSwitcher
      activeView={activeView}
      onViewChange={(view) => {
        onAnalysisStateChange((current) => ({
          ...current,
          view: getDefaultViewConfiguration(view),
        }))
      }}
    />
  )
  const metricControls = (
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
  )
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
          xMetric={analysisState.view.xMetric}
          yMetric={analysisState.view.yMetric}
          relationship={relationship}
          points={relationshipPoints}
          headerControls={headerControls}
        />
      )}

      {activeView === 'seasonal' && (
        <SeasonalMetricChart
          rides={selectedRides}
          totalRideCount={rides.length}
          yMetric={analysisState.view.yMetric}
          buckets={seasonalBuckets}
          headerControls={headerControls}
        />
      )}

      {activeView === 'cumulative' && (
        <CumulativeMetricChart
          rides={selectedRides}
          totalRideCount={rides.length}
          yMetric={analysisState.view.yMetric}
          points={cumulativePoints}
          headerControls={headerControls}
        />
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

function getDefaultViewConfiguration(view: ViewType): AnalysisState['view'] {
  switch (view) {
    case 'trend':
      return { ...defaultTrendView }
    case 'relationship':
      return { ...defaultRelationshipView }
    case 'seasonal':
      return { ...defaultSeasonalView }
    case 'cumulative':
      return { ...defaultCumulativeView }
  }
}
