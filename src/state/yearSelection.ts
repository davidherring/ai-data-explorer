import type { ActivityDataSourceId } from '../data/activityDataSource.ts'

export function reconcileSelectedYears({
  availableYears,
  previousAvailableYears,
  previousSource,
  selectedYears,
  source,
}: {
  availableYears: readonly number[]
  previousAvailableYears?: readonly number[]
  previousSource?: ActivityDataSourceId
  selectedYears: readonly number[]
  source: ActivityDataSourceId
}): number[] {
  const sortedAvailableYears = sortYearsAscending(availableYears)

  if (previousSource === undefined || previousSource !== source) {
    return sortedAvailableYears
  }

  const sortedPreviousAvailableYears = sortYearsAscending(
    previousAvailableYears ?? [],
  )

  if (
    areNumberArraysEqual(
      sortYearsAscending(selectedYears),
      sortedPreviousAvailableYears,
    )
  ) {
    return sortedAvailableYears
  }

  const availableYearSet = new Set(sortedAvailableYears)

  return sortYearsAscending(selectedYears).filter((year) =>
    availableYearSet.has(year),
  )
}

export function sortYearsAscending(years: readonly number[]): number[] {
  return [...years].sort((left, right) => left - right)
}

export function areNumberArraysEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
