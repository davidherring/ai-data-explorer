import {
  getMetricDefinition,
  getMetricDefinitionsForView,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import type { Activity } from '../data/activity.ts'
import type {
  CumulativeMetricKey,
  CumulativeViewConfiguration,
  MetricKey,
  RelationshipViewConfiguration,
  SeasonalViewConfiguration,
  TrendViewConfiguration,
} from '../state/analysisState.ts'

type MetricConfigurableView =
  | TrendViewConfiguration
  | RelationshipViewConfiguration
  | SeasonalViewConfiguration
  | CumulativeViewConfiguration

type SingleMetricViewConfiguration =
  | TrendViewConfiguration
  | SeasonalViewConfiguration
  | CumulativeViewConfiguration

type MetricViewControlsProps = {
  activities: Activity[]
  view: MetricConfigurableView
  onViewChange: (view: MetricConfigurableView) => void
}

const singleMetricAriaLabels = {
  trend: 'Trend metric',
  seasonal: 'Seasonal metric',
  cumulative: 'Cumulative metric',
} as const satisfies Record<SingleMetricViewConfiguration['type'], string>

export function MetricViewControls({
  activities,
  view,
  onViewChange,
}: MetricViewControlsProps) {
  if (view.type === 'relationship') {
    return (
      <div
        className="metric-view-controls"
        role="group"
        aria-label="Chart metrics"
      >
        <MetricSelect
          label="X"
          ariaLabel="Relationship X metric"
          metric={view.xMetric}
          options={getMetricDefinitionsForView('relationship', activities)}
          onMetricChange={(xMetric) => {
            onViewChange({
              ...view,
              xMetric,
            })
          }}
        />
        <MetricSelect
          label="Y"
          ariaLabel="Relationship Y metric"
          metric={view.yMetric}
          options={getMetricDefinitionsForView('relationship', activities)}
          onMetricChange={(yMetric) => {
            onViewChange({
              ...view,
              yMetric,
            })
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="metric-view-controls"
      role="group"
      aria-label="Chart metrics"
    >
      <MetricSelect
        label="Metric"
        ariaLabel={singleMetricAriaLabels[view.type]}
        metric={view.yMetric}
        options={getMetricDefinitionsForView(view.type, activities)}
        onMetricChange={(yMetric) => {
          if (view.type === 'cumulative') {
            onViewChange({
              ...view,
              yMetric: yMetric as CumulativeMetricKey,
            })
            return
          }

          onViewChange({
            ...view,
            yMetric,
          })
        }}
      />
    </div>
  )
}

type MetricSelectProps = {
  label: string
  ariaLabel: string
  metric: MetricKey
  options: MetricDefinition[]
  onMetricChange: (metric: MetricKey) => void
}

function MetricSelect({
  label,
  ariaLabel,
  metric,
  options,
  onMetricChange,
}: MetricSelectProps) {
  const hasSelectedOption = options.some((option) => option.key === metric)
  const selectedDefinition = getMetricDefinition(metric)

  return (
    <label className="metric-view-control">
      <span>{label}</span>
      <select
        aria-label={ariaLabel}
        value={metric}
        onChange={(event) => {
          onMetricChange(event.currentTarget.value as MetricKey)
        }}
      >
        {!hasSelectedOption && (
          <option value={metric}>{selectedDefinition.shortLabel} unavailable</option>
        )}
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.shortLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
