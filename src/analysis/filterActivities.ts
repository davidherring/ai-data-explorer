import type { Activity } from '../data/activity.ts'
import type {
  ActivitySelection,
  DateRange,
  MonthDay,
  NumericRange,
  RecurringDateRange,
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
    matchesRecurringDateRange(activity, selection.recurringDateRange) &&
    matchesDaysOfWeek(activity, selection.daysOfWeek) &&
    matchesNumericRange(activity.distanceMiles, selection.distanceMiles) &&
    matchesNumericRange(activity.elevationGainFeet, selection.elevationGainFeet) &&
    matchesSportType(activity, selection.sportType)
  )
}

function matchesYears(activity: Activity, years: readonly number[]): boolean {
  return years.includes(activity.year)
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

function matchesRecurringDateRange(
  activity: Activity,
  recurringDateRange: ActivitySelection['recurringDateRange'],
): boolean {
  if (!isValidRecurringDateRange(recurringDateRange)) {
    return false
  }

  const activityMonthDay = getActivityMonthDay(activity)

  return (
    compareMonthDay(activityMonthDay, recurringDateRange.start) >= 0 &&
    compareMonthDay(activityMonthDay, recurringDateRange.end) <= 0
  )
}

function matchesDaysOfWeek(
  activity: Activity,
  daysOfWeek: readonly Activity['dayOfWeek'][],
): boolean {
  return daysOfWeek.includes(activity.dayOfWeek)
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

function isValidRecurringDateRange(range: RecurringDateRange): boolean {
  return (
    range.type === 'recurring-month-day' &&
    isValidMonthDay(range.start) &&
    isValidMonthDay(range.end) &&
    compareMonthDay(range.start, range.end) <= 0
  )
}

function isValidMonthDay(monthDay: MonthDay): boolean {
  return (
    Number.isInteger(monthDay.month) &&
    Number.isInteger(monthDay.day) &&
    monthDay.month >= 1 &&
    monthDay.month <= 12 &&
    monthDay.day >= 1 &&
    monthDay.day <= getDaysInMonth(monthDay.month)
  )
}

function getActivityMonthDay(activity: Activity): MonthDay {
  return {
    month: activity.month,
    day: Number(activity.localDate.slice(8, 10)),
  }
}

function getDaysInMonth(month: number): number {
  switch (month) {
    case 2:
      return 29
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

function compareMonthDay(left: MonthDay, right: MonthDay): number {
  return left.month - right.month || left.day - right.day
}
