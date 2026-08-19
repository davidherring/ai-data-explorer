import type { ViewType } from '../state/analysisState.ts'

type AnalysisViewSwitcherProps = {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const switchableViews = [
  'trend',
  'relationship',
  'seasonal',
  'cumulative',
] as const satisfies readonly ViewType[]

const viewLabels = {
  trend: 'Trend',
  relationship: 'Relationship',
  seasonal: 'Seasonal',
  cumulative: 'Cumulative',
} as const satisfies Record<ViewType, string>

export function AnalysisViewSwitcher({
  activeView,
  onViewChange,
}: AnalysisViewSwitcherProps) {
  return (
    <div className="view-switcher" role="group" aria-label="Visualization view">
      {switchableViews.map((view) => (
        <button
          key={view}
          className={getButtonClassName(activeView === view)}
          type="button"
          aria-pressed={activeView === view}
          onClick={() => {
            onViewChange(view)
          }}
        >
          {viewLabels[view]}
        </button>
      ))}
    </div>
  )
}

function getButtonClassName(isActive: boolean): string {
  return isActive
    ? 'view-switcher-button view-switcher-button-active'
    : 'view-switcher-button'
}
