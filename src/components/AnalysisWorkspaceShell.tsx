import { useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import { AnalysisViewSwitcher } from './AnalysisViewSwitcher.tsx'
import { AverageSpeedTrendChart } from './AverageSpeedTrendChart.tsx'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'
import type { Ride } from '../data/ride.ts'
import type { AnalysisState } from '../state/analysisState.ts'

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
  const relationshipPoints = useMemo(
    () =>
      getMetricRelationshipPoints(
        selectedRides,
        'elevationGainFeet',
        'averageSpeedMph',
      ),
    [selectedRides],
  )
  const relationship = useMemo(
    () =>
      relationshipBetweenMetrics(
        selectedRides,
        'elevationGainFeet',
        'averageSpeedMph',
      ),
    [selectedRides],
  )
  const activeView =
    analysisState.view.type === 'relationship' ? 'relationship' : 'trend'
  const viewSwitcher = (
    <AnalysisViewSwitcher
      activeView={activeView}
      onViewChange={(view) => {
        onAnalysisStateChange((current) => ({
          ...current,
          view:
            view === 'relationship'
              ? {
                  type: 'relationship',
                  xMetric: 'elevationGainFeet',
                  yMetric: 'averageSpeedMph',
                }
              : {
                  type: 'trend',
                  yMetric: 'averageSpeedMph',
                },
        }))
      }}
    />
  )

  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      {activeView === 'relationship' ? (
        <RelationshipScatterChart
          rides={selectedRides}
          totalRideCount={rides.length}
          relationship={relationship}
          points={relationshipPoints}
          headerControls={viewSwitcher}
        />
      ) : (
        <AverageSpeedTrendChart
          rides={selectedRides}
          totalRideCount={rides.length}
          headerControls={viewSwitcher}
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
