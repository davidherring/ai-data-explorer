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
import type { Activity } from '../data/activity.ts'
import {
  defaultRelationshipView,
  defaultCumulativeView,
  defaultSeasonalView,
  defaultTrendView,
  type AnalysisState,
  type ViewType,
} from '../state/analysisState.ts'

type AnalysisWorkspaceShellProps = {
  activities: Activity[]
  selectedActivities: Activity[]
  analysisState: AnalysisState
  onAnalysisStateChange: Dispatch<SetStateAction<AnalysisState>>
}

export function AnalysisWorkspaceShell({
  activities,
  selectedActivities,
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
        selectedActivities,
        relationshipView.xMetric,
        relationshipView.yMetric,
      ),
    [relationshipView.xMetric, relationshipView.yMetric, selectedActivities],
  )
  const relationship = useMemo(
    () =>
      relationshipBetweenMetrics(
        selectedActivities,
        relationshipView.xMetric,
        relationshipView.yMetric,
      ),
    [relationshipView.xMetric, relationshipView.yMetric, selectedActivities],
  )
  const seasonalBuckets = useMemo(
    () => buildSeasonalMetricBuckets(selectedActivities, seasonalView.yMetric),
    [seasonalView.yMetric, selectedActivities],
  )
  const cumulativePoints = useMemo(
    () => buildCumulativeMetricPoints(selectedActivities, cumulativeView.yMetric),
    [cumulativeView.yMetric, selectedActivities],
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
      activities={activities}
      view={analysisState.view}
      onViewChange={(view) => {
        onAnalysisStateChange((current) => ({
          ...current,
          view,
        }))
      }}
    />
  )
  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      {activeView === 'trend' && (
        <MetricTrendChart
          activities={selectedActivities}
          totalActivityCount={activities.length}
          yMetric={analysisState.view.yMetric}
          viewControls={viewSwitcher}
          metricControls={metricControls}
        />
      )}

      {activeView === 'relationship' && (
        <RelationshipScatterChart
          activities={selectedActivities}
          totalActivityCount={activities.length}
          xMetric={analysisState.view.xMetric}
          yMetric={analysisState.view.yMetric}
          relationship={relationship}
          points={relationshipPoints}
          viewControls={viewSwitcher}
          metricControls={metricControls}
        />
      )}

      {activeView === 'seasonal' && (
        <SeasonalMetricChart
          activities={selectedActivities}
          totalActivityCount={activities.length}
          yMetric={analysisState.view.yMetric}
          buckets={seasonalBuckets}
          viewControls={viewSwitcher}
          metricControls={metricControls}
        />
      )}

      {activeView === 'cumulative' && (
        <CumulativeMetricChart
          activities={selectedActivities}
          totalActivityCount={activities.length}
          yMetric={analysisState.view.yMetric}
          points={cumulativePoints}
          viewControls={viewSwitcher}
          metricControls={metricControls}
        />
      )}

      <div className="controls-placeholder">
        <p className="section-label">Selection / analysis controls</p>
        <ActivitySelectionControls
          activities={activities}
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
