import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  formatActivityYear,
  getPlottedActivityYears,
  shouldEncodeActivityYear,
} from './activityYearEncoding.ts'

describe('activity year encoding helpers', () => {
  it('derives distinct plotted years in ascending order', () => {
    expect(
      getPlottedActivityYears([
        { activity: createActivity({ year: 2026 }) },
        { activity: createActivity({ year: 2025 }) },
        { activity: createActivity({ year: 2026 }) },
      ]),
    ).toEqual([2025, 2026])
  })

  it('encodes year only when plotted points span multiple years', () => {
    expect(shouldEncodeActivityYear([])).toBe(false)
    expect(
      shouldEncodeActivityYear([
        { activity: createActivity({ year: 2025 }) },
        { activity: createActivity({ year: 2025 }) },
      ]),
    ).toBe(false)
    expect(
      shouldEncodeActivityYear([
        { activity: createActivity({ year: 2025 }) },
        { activity: createActivity({ year: 2026 }) },
      ]),
    ).toBe(true)
  })

  it('formats years for Plot categorical channels', () => {
    expect(formatActivityYear(2026)).toBe('2026')
  })
})

function createActivity(overrides: Partial<Pick<Activity, 'year'>> = {}): Activity {
  return {
    id: 'activity-a',
    startTime: '2025-01-01T07:00:00-07:00',
    localDate: '2025-01-01',
    year: overrides.year ?? 2025,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: 20,
    movingTimeMinutes: 60,
    averageSpeedMph: 15,
    elevationGainFeet: 500,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
