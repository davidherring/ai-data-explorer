import type { Ride } from '../data/ride.ts'

type SelectionStatusProps = {
  rides: Ride[]
  totalRideCount: number
}

const sparseSelectionThreshold = 3
const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})
const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function SelectionStatus({ rides, totalRideCount }: SelectionStatusProps) {
  const selectedRideCount = rides.length
  const isEmpty = selectedRideCount === 0
  const isSparse =
    selectedRideCount > 0 && selectedRideCount < sparseSelectionThreshold

  return (
    <section className="selection-status" aria-label="Selection status">
      <div className="selection-status-primary">
        <strong>
          {selectedRideCount} of {totalRideCount} {pluralizeRide(totalRideCount)}{' '}
          selected
        </strong>
        <span>{getSelectionMessage(isEmpty, isSparse)}</span>
      </div>

      {!isEmpty && (
        <dl className="selection-metrics" aria-label="Selection averages">
          <div>
            <dt>Avg speed</dt>
            <dd>{formatDecimal(mean(rides, 'averageSpeedMph'))} mph</dd>
          </div>
          <div>
            <dt>Avg distance</dt>
            <dd>{formatDecimal(mean(rides, 'distanceMiles'))} mi</dd>
          </div>
          <div>
            <dt>Avg elevation</dt>
            <dd>{formatWhole(mean(rides, 'elevationGainFeet'))} ft</dd>
          </div>
        </dl>
      )}
    </section>
  )
}

function getSelectionMessage(isEmpty: boolean, isSparse: boolean): string {
  if (isEmpty) {
    return 'No rides match the current filters.'
  }

  if (isSparse) {
    return 'Too few rides for a meaningful trend.'
  }

  return 'Selection ready.'
}

function pluralizeRide(count: number): string {
  return count === 1 ? 'ride' : 'rides'
}

function mean(rides: readonly Ride[], metric: keyof Pick<
  Ride,
  'averageSpeedMph' | 'distanceMiles' | 'elevationGainFeet'
>): number {
  return rides.reduce((total, ride) => total + ride[metric], 0) / rides.length
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

function formatWhole(value: number): string {
  return wholeNumberFormatter.format(Math.round(value))
}
