import type { Ride } from '../data/ride.ts'
import type {
  ActivitySelection,
  DateRange,
  NumericRange,
} from '../state/analysisState.ts'

export function filterRides(
  rides: readonly Ride[],
  selection: ActivitySelection,
): Ride[] {
  return rides.filter((ride) => matchesSelection(ride, selection))
}

function matchesSelection(ride: Ride, selection: ActivitySelection): boolean {
  return (
    matchesYears(ride, selection.years) &&
    matchesDateRange(ride, selection.dateRange) &&
    matchesDayMode(ride, selection.dayMode) &&
    matchesDaysOfWeek(ride, selection.daysOfWeek) &&
    matchesNumericRange(ride.distanceMiles, selection.distanceMiles) &&
    matchesNumericRange(ride.elevationGainFeet, selection.elevationGainFeet) &&
    matchesSportType(ride, selection.sportType)
  )
}

function matchesYears(ride: Ride, years: readonly number[] | undefined): boolean {
  return years === undefined || years.length === 0 || years.includes(ride.year)
}

function matchesDateRange(ride: Ride, dateRange: DateRange | undefined): boolean {
  if (dateRange === undefined) {
    return true
  }

  if (dateRange.start !== undefined && ride.localDate < dateRange.start) {
    return false
  }

  if (dateRange.end !== undefined && ride.localDate > dateRange.end) {
    return false
  }

  return true
}

function matchesDayMode(
  ride: Ride,
  dayMode: ActivitySelection['dayMode'],
): boolean {
  if (dayMode === undefined || dayMode === 'all') {
    return true
  }

  return dayMode === 'weekend' ? ride.isWeekend : !ride.isWeekend
}

function matchesDaysOfWeek(
  ride: Ride,
  daysOfWeek: ActivitySelection['daysOfWeek'],
): boolean {
  return (
    daysOfWeek === undefined ||
    daysOfWeek.length === 0 ||
    daysOfWeek.includes(ride.dayOfWeek)
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

function matchesSportType(ride: Ride, sportType: string | undefined): boolean {
  return sportType === undefined || sportType === '' || ride.sportType === sportType
}
