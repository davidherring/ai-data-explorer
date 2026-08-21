import type { Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getActivityMetric } from './activityMetrics.ts'

export type CumulativeMetricPoint = {
  date: Date
  localDate: string
  activityId: string
  activity: Activity
  value: number
  cumulativeValue: number
}

type CumulativeMetricCandidate = {
  activity: Activity
  value: number
  sortKey: number
}

export function buildCumulativeMetricPoints(
  activities: readonly Activity[],
  metricKey: MetricKey,
): CumulativeMetricPoint[] {
  const candidates: CumulativeMetricCandidate[] = []

  for (const activity of activities) {
    const value = getActivityMetric(activity, metricKey)

    if (value === undefined || !Number.isFinite(value)) {
      continue
    }

    candidates.push({
      activity,
      value,
      sortKey: getActivityLocalTimeSortKey(activity),
    })
  }

  candidates.sort(
    (a, b) => a.sortKey - b.sortKey || a.activity.id.localeCompare(b.activity.id),
  )

  let cumulativeValue = 0

  return candidates.map(({ activity, value }) => {
    cumulativeValue += value

    return {
      date: parseLocalCalendarDate(activity.localDate),
      localDate: activity.localDate,
      activityId: activity.id,
      activity,
      value,
      cumulativeValue,
    }
  })
}

function getActivityLocalTimeSortKey(activity: Activity): number {
  return parseLocalStartTimeSortKey(activity.startTime) ?? parseLocalDateSortKey(activity.localDate)
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
