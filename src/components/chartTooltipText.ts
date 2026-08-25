import {
  getMetricDefinition,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import type { CumulativeMetricPoint } from '../analysis/cumulativeMetrics.ts'
import type { MetricRelationshipPoint } from '../analysis/metricRelationships.ts'
import type { SeasonalMetricBucket } from '../analysis/seasonalMetrics.ts'
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

export function formatTrendPointTooltipTitle(
  point: { activity: Activity; value: number },
  yMetric: MetricKey,
  metricDefinition: MetricDefinition,
): string {
  const { activity } = point
  const lines = [
    `Date: ${activity.localDate}`,
    `Activity type: ${activity.sportType}`,
    `${metricDefinition.label}: ${formatMetricValue(point.value, metricDefinition)}`,
  ]

  addActivityContextLines(lines, activity, [yMetric])

  return lines.join('\n')
}

export function formatRelationshipPointTooltipTitle(
  point: MetricRelationshipPoint,
  xMetric: MetricKey,
  yMetric: MetricKey,
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
): string {
  const { activity } = point
  const lines = [
    `Date: ${activity.localDate}`,
    `Activity type: ${activity.sportType}`,
    `${xDefinition.label}: ${formatMetricValue(point.x, xDefinition)}`,
  ]

  if (xMetric !== yMetric) {
    lines.push(`${yDefinition.label}: ${formatMetricValue(point.y, yDefinition)}`)
  }

  addActivityContextLines(
    lines,
    activity,
    xMetric === yMetric ? [xMetric] : [xMetric, yMetric],
  )

  return lines.join('\n')
}

export function formatSeasonalBucketTooltipTitle(
  bucket: SeasonalMetricBucket,
  metricDefinition: MetricDefinition,
): string {
  const lines = [
    `Year: ${bucket.year}`,
    `${formatWeekRange(bucket)}`,
    `${metricDefinition.label} median: ${formatMetricValue(
      bucket.value,
      metricDefinition,
    )}`,
    `Sample count: ${bucket.sampleCount} ${formatActivityCount(bucket.sampleCount)}`,
  ]

  if (bucket.sparse) {
    lines.push('Sparse bucket')
  }

  return lines.join('\n')
}

export function formatCumulativePointTooltipTitle(
  point: CumulativeMetricPoint,
  yMetric: MetricKey,
  metricDefinition: MetricDefinition,
): string {
  const { activity } = point
  const lines = [
    `Date: ${point.localDate}`,
    `Activity type: ${activity.sportType}`,
    `Activity ${metricDefinition.label}: ${formatMetricValue(point.value, metricDefinition)}`,
    `Cumulative ${metricDefinition.label}: ${formatMetricValue(
      point.cumulativeValue,
      metricDefinition,
    )}`,
  ]

  addActivityContextLines(lines, activity, [yMetric])

  return lines.join('\n')
}

function formatWeekRange(bucket: SeasonalMetricBucket): string {
  return bucket.startWeek === bucket.endWeek
    ? `Week: ${bucket.startWeek}`
    : `Weeks: ${bucket.startWeek}-${bucket.endWeek}`
}

function formatActivityCount(count: number): string {
  return count === 1 ? 'activity' : 'activities'
}
