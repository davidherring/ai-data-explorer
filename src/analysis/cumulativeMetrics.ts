import type { Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getRideMetric } from './rideMetrics.ts'

export type CumulativeMetricPoint = {
  date: Date
  localDate: string
  rideId: string
  ride: Ride
  value: number
  cumulativeValue: number
}

type CumulativeMetricCandidate = {
  ride: Ride
  value: number
  sortKey: number
}

export function buildCumulativeMetricPoints(
  rides: readonly Ride[],
  metricKey: MetricKey,
): CumulativeMetricPoint[] {
  const candidates: CumulativeMetricCandidate[] = []

  for (const ride of rides) {
    const value = getRideMetric(ride, metricKey)

    if (value === undefined || !Number.isFinite(value)) {
      continue
    }

    candidates.push({
      ride,
      value,
      sortKey: getRideLocalTimeSortKey(ride),
    })
  }

  candidates.sort(
    (a, b) => a.sortKey - b.sortKey || a.ride.id.localeCompare(b.ride.id),
  )

  let cumulativeValue = 0

  return candidates.map(({ ride, value }) => {
    cumulativeValue += value

    return {
      date: parseLocalCalendarDate(ride.localDate),
      localDate: ride.localDate,
      rideId: ride.id,
      ride,
      value,
      cumulativeValue,
    }
  })
}

function getRideLocalTimeSortKey(ride: Ride): number {
  return parseLocalStartTimeSortKey(ride.startTime) ?? parseLocalDateSortKey(ride.localDate)
}

function parseLocalStartTimeSortKey(startTime: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(
    startTime,
  )

  if (!match) {
    return undefined
  }

  const [, year, month, day, hour, minute, second] = match

  return Number(`${year}${month}${day}${hour}${minute}${second}`)
}

function parseLocalDateSortKey(localDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)

  if (!match) {
    return 0
  }

  const [, year, month, day] = match

  return Number(`${year}${month}${day}000000`)
}

function parseLocalCalendarDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}
