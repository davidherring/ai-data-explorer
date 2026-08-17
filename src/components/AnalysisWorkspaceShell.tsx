import type { Ride } from '../data/ride.ts'
import type { AnalysisState } from '../state/analysisState.ts'

type AnalysisWorkspaceShellProps = {
  rides: Ride[]
  selectedRides: Ride[]
  analysisState: AnalysisState
}

export function AnalysisWorkspaceShell({
  rides,
  selectedRides,
  analysisState,
}: AnalysisWorkspaceShellProps) {
  const activeMetric = analysisState.view.yMetric ?? 'averageSpeedMph'

  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      <div className="visualization-placeholder">
        <p className="section-label">Analysis workspace</p>
        <h2>Visualization area</h2>
        <p>Static placeholder for the future shared-state visualization surface.</p>
        <p>{rides.length} normalized rides available.</p>
        <p>{selectedRides.length} rides currently selected.</p>
        <p>
          Current view: {analysisState.view.type}; metric: {activeMetric}.
        </p>
      </div>

      <div className="controls-placeholder">
        <p className="section-label">Selection / analysis controls</p>
        <div className="control-grid" aria-label="Future controls">
          <span>Date range</span>
          <span>Day type</span>
          <span>Distance</span>
          <span>Elevation</span>
          <span>View mode</span>
          <span>Metric</span>
        </div>
      </div>
    </section>
  )
}
