import type { Dispatch, SetStateAction } from 'react'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import { AverageSpeedTrendChart } from './AverageSpeedTrendChart.tsx'
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
  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      <AverageSpeedTrendChart
        rides={selectedRides}
        totalRideCount={rides.length}
      />

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
