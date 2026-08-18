type SwitchableAnalysisView = 'trend' | 'relationship'

type AnalysisViewSwitcherProps = {
  activeView: SwitchableAnalysisView
  onViewChange: (view: SwitchableAnalysisView) => void
}

export function AnalysisViewSwitcher({
  activeView,
  onViewChange,
}: AnalysisViewSwitcherProps) {
  return (
    <div className="view-switcher" role="group" aria-label="Visualization view">
      <button
        className={getButtonClassName(activeView === 'trend')}
        type="button"
        aria-pressed={activeView === 'trend'}
        onClick={() => {
          onViewChange('trend')
        }}
      >
        Trend
      </button>
      <button
        className={getButtonClassName(activeView === 'relationship')}
        type="button"
        aria-pressed={activeView === 'relationship'}
        onClick={() => {
          onViewChange('relationship')
        }}
      >
        Relationship
      </button>
    </div>
  )
}

function getButtonClassName(isActive: boolean): string {
  return isActive
    ? 'view-switcher-button view-switcher-button-active'
    : 'view-switcher-button'
}
