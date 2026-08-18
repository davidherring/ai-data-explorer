import type { Dispatch, SetStateAction } from 'react'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import { AnalysisViewSwitcher } from './AnalysisViewSwitcher.tsx'
import { AverageSpeedTrendChart } from './AverageSpeedTrendChart.tsx'
import { SelectionStatus } from './SelectionStatus.tsx'
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
        <figure
          className="trend-chart relationship-placeholder"
          aria-label="Elevation gain vs average speed"
        >
          <figcaption className="trend-chart-header">
            <div className="trend-chart-title">
              <span className="section-label">Relationship</span>
              <strong>Elevation gain vs average speed</strong>
            </div>
            {viewSwitcher}
            <SelectionStatus rides={selectedRides} totalRideCount={rides.length} />
          </figcaption>

          <div className="trend-chart-container">
            <div className="chart-empty-state">
              Relationship scatter view will render here.
            </div>
          </div>
        </figure>
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
