import type { Activity } from '../data/activity.ts'

type SelectionStatusProps = {
  activities: Activity[]
  totalActivityCount: number
}

const sparseSelectionThreshold = 3
const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})
const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function SelectionStatus({ activities, totalActivityCount }: SelectionStatusProps) {
  const selectedActivityCount = activities.length
  const isEmpty = selectedActivityCount === 0
  const isSparse =
    selectedActivityCount > 0 && selectedActivityCount < sparseSelectionThreshold

  return (
    <section className="selection-status" aria-label="Selection status">
      <div className="selection-status-primary">
        <strong>
          {selectedActivityCount} of {totalActivityCount} {pluralizeActivity(totalActivityCount)}{' '}
          selected
        </strong>
        <span>{getSelectionMessage(isEmpty, isSparse)}</span>
      </div>

      {!isEmpty && (
        <dl className="selection-metrics" aria-label="Selection averages">
          <div>
            <dt>Avg speed</dt>
            <dd>{formatDecimal(mean(activities, 'averageSpeedMph'))} mph</dd>
          </div>
          <div>
            <dt>Avg distance</dt>
            <dd>{formatDecimal(mean(activities, 'distanceMiles'))} mi</dd>
          </div>
          <div>
            <dt>Avg elevation</dt>
            <dd>{formatWhole(mean(activities, 'elevationGainFeet'))} ft</dd>
          </div>
        </dl>
      )}
    </section>
  )
}

function getSelectionMessage(isEmpty: boolean, isSparse: boolean): string {
  if (isEmpty) {
    return 'No activities match the current filters.'
  }

  if (isSparse) {
    return 'Too few activities for a meaningful trend.'
  }

  return 'Selection ready.'
}

function pluralizeActivity(count: number): string {
  return count === 1 ? 'activity' : 'activities'
}

function mean(activities: readonly Activity[], metric: keyof Pick<
  Activity,
  'averageSpeedMph' | 'distanceMiles' | 'elevationGainFeet'
>): number {
  return activities.reduce((total, activity) => total + activity[metric], 0) / activities.length
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

function formatWhole(value: number): string {
  return wholeNumberFormatter.format(Math.round(value))
}
