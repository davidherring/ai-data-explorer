import type { Activity, DayOfWeek } from '../../src/data/activity.js'
import type { StravaSummaryActivity } from './activities.js'

const METERS_TO_MILES = 0.000621371
const METERS_TO_FEET = 3.28084
const METERS_PER_SECOND_TO_MILES_PER_HOUR = 2.23694
const SECONDS_TO_MINUTES = 1 / 60

const dayOfWeekByUtcIndex: readonly DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

type LocalDateParts = {
  year: number
  month: number
  day: number
}

export function normalizeStravaActivity(activity: StravaSummaryActivity): Activity {
  const localDate = getLocalDate(activity.start_date_local)
  const localDateParts = parseLocalDate(localDate)
  const dayOfWeek = getDayOfWeek(localDateParts)

  return {
    id: activity.id.toString(),
    startTime: activity.start_date_local,
    localDate,
    year: localDateParts.year,
    month: localDateParts.month,
    weekOfYear: getIsoWeekOfYear(localDateParts),
    dayOfWeek,
    isWeekend: dayOfWeek === 'saturday' || dayOfWeek === 'sunday',
    distanceMiles: activity.distance * METERS_TO_MILES,
    movingTimeMinutes: activity.moving_time * SECONDS_TO_MINUTES,
    elapsedTimeMinutes: activity.elapsed_time * SECONDS_TO_MINUTES,
    averageSpeedMph: activity.average_speed * METERS_PER_SECOND_TO_MILES_PER_HOUR,
    elevationGainFeet: activity.total_elevation_gain * METERS_TO_FEET,
    sportType: activity.sport_type,
    trainer: activity.trainer,
    commute: activity.commute,
    manual: activity.manual,
  }
}

export function normalizeStravaActivities(
  activities: readonly StravaSummaryActivity[],
): {
  activities: Activity[]
  deduplicated: number
} {
  const seenIds = new Set<string>()
  const normalizedActivities: Activity[] = []
  let deduplicated = 0

  for (const activity of activities) {
    const id = activity.id.toString()

    if (seenIds.has(id)) {
      deduplicated += 1
      continue
    }

    seenIds.add(id)
    normalizedActivities.push(normalizeStravaActivity(activity))
  }

  return { activities: normalizedActivities, deduplicated }
}

function getLocalDate(startDateLocal: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(startDateLocal)

  if (!match) {
    throw new Error('Invalid Strava local start date')
  }

  return match[1] ?? ''
}

function parseLocalDate(localDate: string): LocalDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)

  if (!match) {
    throw new Error('Invalid local date')
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function getDayOfWeek(localDate: LocalDateParts): DayOfWeek {
  const dayIndex = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day),
  ).getUTCDay()

  return dayOfWeekByUtcIndex[dayIndex] ?? 'sunday'
}

function getIsoWeekOfYear(localDate: LocalDateParts): number {
  const date = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day))
  const day = date.getUTCDay() || 7

  date.setUTCDate(date.getUTCDate() + 4 - day)

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const daysSinceYearStart =
    (date.getTime() - yearStart.getTime()) / 86_400_000 + 1

  return Math.ceil(daysSinceYearStart / 7)
}
