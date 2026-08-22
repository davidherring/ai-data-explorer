import type { Activity } from '../data/activity.ts'

type ActivityPoint = {
  activity: Activity
}

export function getPlottedActivityYears(
  points: readonly ActivityPoint[],
): number[] {
  return Array.from(new Set(points.map((point) => point.activity.year))).sort(
    compareNumbers,
  )
}

export function shouldEncodeActivityYear(
  points: readonly ActivityPoint[],
): boolean {
  return getPlottedActivityYears(points).length > 1
}

export function formatActivityYear(year: number): string {
  return String(year)
}

function compareNumbers(left: number, right: number): number {
  return left - right
}
