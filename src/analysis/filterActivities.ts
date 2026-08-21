import type { Activity } from '../data/activity.ts'
import type {
  ActivitySelection,
  DateRange,
  NumericRange,
} from '../state/analysisState.ts'

export function filterActivities(
  activities: readonly Activity[],
  selection: ActivitySelection,
): Activity[] {
  return activities.filter((activity) => matchesSelection(activity, selection))
}

function matchesSelection(activity: Activity, selection: ActivitySelection): boolean {
  return (
    matchesYears(activity, selection.years) &&
    matchesDateRange(activity, selection.dateRange) &&
    matchesDayMode(activity, selection.dayMode) &&
    matchesDaysOfWeek(activity, selection.daysOfWeek) &&
    matchesNumericRange(activity.distanceMiles, selection.distanceMiles) &&
    matchesNumericRange(activity.elevationGainFeet, selection.elevationGainFeet) &&
    matchesSportType(activity, selection.sportType)
  )
}

function matchesYears(activity: Activity, years: readonly number[] | undefined): boolean {
  return years === undefined || years.length === 0 || years.includes(activity.year)
}

function matchesDateRange(activity: Activity, dateRange: DateRange | undefined): boolean {
  if (dateRange === undefined) {
    return true
  }

  if (dateRange.start !== undefined && activity.localDate < dateRange.start) {
    return false
  }

  if (dateRange.end !== undefined && activity.localDate > dateRange.end) {
    return false
  }

  return true
}

function matchesDayMode(
  activity: Activity,
  dayMode: ActivitySelection['dayMode'],
): boolean {
  if (dayMode === undefined || dayMode === 'all') {
    return true
  }

  return dayMode === 'weekend' ? activity.isWeekend : !activity.isWeekend
}

function matchesDaysOfWeek(
  activity: Activity,
  daysOfWeek: ActivitySelection['daysOfWeek'],
): boolean {
  return (
    daysOfWeek === undefined ||
    daysOfWeek.length === 0 ||
    daysOfWeek.includes(activity.dayOfWeek)
  )
}

function matchesNumericRange(
  value: number,
  range: NumericRange | undefined,
): boolean {
  if (range === undefined) {
    return true
  }

  if (
    range.min !== undefined &&
    range.max !== undefined &&
    range.min > range.max
  ) {
    return false
  }

  if (range.min !== undefined && value < range.min) {
    return false
  }

  if (range.max !== undefined && value > range.max) {
    return false
  }

  return true
}

function matchesSportType(activity: Activity, sportType: string | undefined): boolean {
  return sportType === undefined || sportType === '' || activity.sportType === sportType
}
