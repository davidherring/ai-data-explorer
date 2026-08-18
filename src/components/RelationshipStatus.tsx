import type { MetricRelationshipResult } from '../analysis/metricRelationships.ts'

type RelationshipStatusProps = {
  relationship: MetricRelationshipResult
}

export function RelationshipStatus({ relationship }: RelationshipStatusProps) {
  return (
    <p className="relationship-status" aria-label="Relationship status">
      {formatRelationshipStatus(relationship)}
    </p>
  )
}

function formatRelationshipStatus(
  relationship: MetricRelationshipResult,
): string {
  switch (relationship.status) {
    case 'ready':
      return `${formatPairCount(relationship)} · Pearson r = ${formatPearson(
        relationship.pearsonR,
      )}`
    case 'insufficient-valid-pairs':
      return 'Too few valid rides to calculate Pearson r.'
    case 'zero-x-variance':
      return 'Elevation does not vary enough to calculate Pearson r.'
    case 'zero-y-variance':
      return 'Average speed does not vary enough to calculate Pearson r.'
  }
}

function formatPairCount(relationship: MetricRelationshipResult): string {
  const rideLabel = relationship.validPairCount === 1 ? 'ride' : 'rides'

  if (relationship.sampleCount === relationship.validPairCount) {
    return `${relationship.validPairCount} ${rideLabel}`
  }

  return `${relationship.validPairCount} valid ${rideLabel}`
}

function formatPearson(pearsonR: number | undefined): string {
  return pearsonR?.toFixed(2) ?? ''
}
