import {
  getMetricDefinition,
  getMetricDefinitionsForRole,
  type MetricDefinition,
} from '../analysis/rideMetrics.ts'
import type { Ride } from '../data/ride.ts'
import type {
  MetricKey,
  RelationshipViewConfiguration,
  TrendViewConfiguration,
} from '../state/analysisState.ts'

type MetricViewControlsProps = {
  rides: Ride[]
  view: TrendViewConfiguration | RelationshipViewConfiguration
  onViewChange: (
    view: TrendViewConfiguration | RelationshipViewConfiguration,
  ) => void
}

export function MetricViewControls({
  rides,
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
          options={getMetricDefinitionsForRole('relationshipX', rides)}
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
          options={getMetricDefinitionsForRole('relationshipY', rides)}
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
        ariaLabel="Trend metric"
        metric={view.yMetric}
        options={getMetricDefinitionsForRole('trendY', rides)}
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
        {!hasSelectedOption && selectedDefinition.optional && (
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
