import type { MetricRelationshipResult } from '../analysis/metricRelationships.ts'
import { getMetricDefinition } from '../analysis/activityMetrics.ts'
import type { MetricKey } from '../state/analysisState.ts'

type RelationshipStatusProps = {
  relationship: MetricRelationshipResult
  xMetric: MetricKey
  yMetric: MetricKey
}

export function RelationshipStatus({
  relationship,
  xMetric,
  yMetric,
}: RelationshipStatusProps) {
  return (
    <p className="relationship-status" aria-label="Relationship status">
      {formatRelationshipStatus(relationship, xMetric, yMetric)}
    </p>
  )
}

function formatRelationshipStatus(
  relationship: MetricRelationshipResult,
  xMetric: MetricKey,
  yMetric: MetricKey,
): string {
  switch (relationship.status) {
    case 'ready':
      return `${formatPairCount(relationship)} · Pearson r = ${formatPearson(
        relationship.pearsonR,
      )}`
    case 'insufficient-valid-pairs':
      return 'Too few valid activities to calculate Pearson r.'
    case 'zero-x-variance':
      return `${getMetricDefinition(
        xMetric,
      ).label} does not vary enough to calculate Pearson r.`
    case 'zero-y-variance':
      return `${getMetricDefinition(
        yMetric,
      ).label} does not vary enough to calculate Pearson r.`
  }
}

function formatPairCount(relationship: MetricRelationshipResult): string {
  const activityLabel =
    relationship.validPairCount === 1 ? 'activity' : 'activities'

  if (relationship.sampleCount === relationship.validPairCount) {
    return `${relationship.validPairCount} ${activityLabel}`
  }

  return `${relationship.validPairCount} valid ${activityLabel}`
}

function formatPearson(pearsonR: number | undefined): string {
  return pearsonR?.toFixed(2) ?? ''
}
