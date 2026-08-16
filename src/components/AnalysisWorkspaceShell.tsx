export function AnalysisWorkspaceShell() {
  return (
    <section className="analysis-workspace" aria-label="Analysis workspace">
      <div className="visualization-placeholder">
        <p className="section-label">Analysis workspace</p>
        <h2>Visualization area</h2>
        <p>Static placeholder for the future shared-state visualization surface.</p>
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
