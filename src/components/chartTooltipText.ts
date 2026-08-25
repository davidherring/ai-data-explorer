import {
  getMetricDefinition,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import type { Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'

const activityContextMetrics = [
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly MetricKey[]

export function formatMetricValue(
  value: number,
  metricDefinition: MetricDefinition,
): string {
  return `${metricDefinition.format(value)} ${metricDefinition.unit}`
}

export function addActivityContextLines(
  lines: string[],
  activity: Activity,
  representedMetrics: readonly MetricKey[],
): void {
  for (const metric of activityContextMetrics) {
    if (representedMetrics.includes(metric)) {
      continue
    }

    const value = activity[metric]

    if (!Number.isFinite(value)) {
      continue
    }

    const definition = getMetricDefinition(metric)

    lines.push(`${definition.label}: ${formatMetricValue(value, definition)}`)
  }
}
