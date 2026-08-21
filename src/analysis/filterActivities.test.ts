import { describe, expect, it } from 'vitest'
import { filterActivities } from './filterActivities.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { ActivitySelection } from '../state/analysisState.ts'

const activities: Activity[] = [
  createActivity({
    id: 'activity-2024-monday',
    localDate: '2024-01-01',
    year: 2024,
    dayOfWeek: 'monday',
    isWeekend: false,
    distanceMiles: 10,
    elevationGainFeet: 100,
    sportType: 'Ride',
  }),
  createActivity({
    id: 'activity-2024-saturday',
    localDate: '2024-06-15',
    year: 2024,
    dayOfWeek: 'saturday',
    isWeekend: true,
    distanceMiles: 20,
    elevationGainFeet: 500,
    sportType: 'GravelRide',
  }),
  createActivity({
    id: 'activity-2025-wednesday',
    localDate: '2025-03-12',
    year: 2025,
    dayOfWeek: 'wednesday',
    isWeekend: false,
    distanceMiles: 30,
    elevationGainFeet: 1000,
    sportType: 'Ride',
  }),
  createActivity({
    id: 'activity-2025-june-window',
    localDate: '2025-06-20',
    year: 2025,
    dayOfWeek: 'friday',
    isWeekend: false,
    distanceMiles: 32,
    elevationGainFeet: 1200,
    sportType: 'Ride',
  }),
  createActivity({
    id: 'activity-2025-sunday',
    localDate: '2025-12-28',
    year: 2025,
    dayOfWeek: 'sunday',
    isWeekend: true,
    distanceMiles: 40,
    elevationGainFeet: 1500,
    sportType: 'VirtualRide',
  }),
  createActivity({
    id: 'activity-2020-leap-day',
    localDate: '2020-02-29',
    year: 2020,
    dayOfWeek: 'saturday',
    isWeekend: true,
    distanceMiles: 15,
    elevationGainFeet: 300,
    sportType: 'Walk',
  }),
]

describe('filterActivities', () => {
  it('returns all activities when no filters are active', () => {
    expect(ids(filterActivities(activities, {}))).toEqual([
      'activity-2024-monday',
      'activity-2024-saturday',
      'activity-2025-wednesday',
      'activity-2025-june-window',
      'activity-2025-sunday',
      'activity-2020-leap-day',
    ])
  })

  it('returns a new array and preserves source order', () => {
    const result = filterActivities(activities, { years: [2020, 2024, 2025] })

    expect(result).not.toBe(activities)
    expect(result).toEqual(activities)
    expect(ids(result)).toEqual(ids(activities))
  })

  it('does not mutate the input array or activity objects', () => {
    const originalOrder = [...activities]
    const originalRide = { ...activities[0] }

    filterActivities(activities, { years: [2025], distanceMiles: { min: 30 } })

    expect(activities).toEqual(originalOrder)
    expect(activities[0]).toEqual(originalRide)
  })

  it('filters by years', () => {
    expect(ids(filterActivities(activities, { years: [2025] }))).toEqual([
      'activity-2025-wednesday',
      'activity-2025-june-window',
      'activity-2025-sunday',
    ])
  })

  it('does not constrain when years is empty', () => {
    expect(filterActivities(activities, { years: [] })).toHaveLength(6)
  })

  it('filters by inclusive date range bounds', () => {
    expect(
      ids(
        filterActivities(activities, {
          dateRange: { start: '2024-06-15', end: '2025-03-12' },
        }),
      ),
    ).toEqual(['activity-2024-saturday', 'activity-2025-wednesday'])
  })

  it('filters by recurring month-day range across selected years', () => {
    const result = filterActivities(activities, {
      years: [2024, 2025],
      recurringDateRange: {
        type: 'recurring-month-day',
        start: { month: 3, day: 15 },
        end: { month: 6, day: 20 },
      },
    })

    expect(ids(result)).toEqual([
      'activity-2024-saturday',
      'activity-2025-june-window',
    ])
  })

  it('includes recurring month-day start and end boundaries', () => {
    expect(
      ids(
        filterActivities(activities, {
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 6, day: 15 },
            end: { month: 6, day: 15 },
          },
        }),
      ),
    ).toEqual(['activity-2024-saturday'])
  })

  it('allows Feb 29 in recurring month-day ranges', () => {
    expect(
      ids(
        filterActivities(activities, {
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 2, day: 29 },
            end: { month: 2, day: 29 },
          },
        }),
      ),
    ).toEqual(['activity-2020-leap-day'])
  })

  it('returns no matches for reversed recurring month-day ranges', () => {
    expect(
      filterActivities(activities, {
        recurringDateRange: {
          type: 'recurring-month-day',
          start: { month: 6, day: 20 },
          end: { month: 3, day: 15 },
        },
      }),
    ).toEqual([])
  })

  it('filters by date start only', () => {
    expect(
      ids(filterActivities(activities, { dateRange: { start: '2025-01-01' } })),
    ).toEqual([
      'activity-2025-wednesday',
      'activity-2025-june-window',
      'activity-2025-sunday',
    ])
  })

  it('filters by date end only', () => {
    expect(
      ids(filterActivities(activities, { dateRange: { end: '2024-12-31' } })),
    ).toEqual([
      'activity-2024-monday',
      'activity-2024-saturday',
      'activity-2020-leap-day',
    ])
  })

  it('intersects year and date range filters', () => {
    expect(
      ids(
        filterActivities(activities, {
          years: [2024],
          dateRange: { start: '2024-06-01' },
        }),
      ),
    ).toEqual(['activity-2024-saturday'])
  })

  it('filters by dayMode', () => {
    expect(ids(filterActivities(activities, { dayMode: 'all' }))).toEqual(ids(activities))
    expect(ids(filterActivities(activities, { dayMode: 'weekday' }))).toEqual([
      'activity-2024-monday',
      'activity-2025-wednesday',
      'activity-2025-june-window',
    ])
    expect(ids(filterActivities(activities, { dayMode: 'weekend' }))).toEqual([
      'activity-2024-saturday',
      'activity-2025-sunday',
      'activity-2020-leap-day',
    ])
  })

  it('filters by daysOfWeek', () => {
    expect(
      ids(filterActivities(activities, { daysOfWeek: ['wednesday', 'sunday'] })),
    ).toEqual(['activity-2025-wednesday', 'activity-2025-sunday'])
  })

  it('does not constrain when daysOfWeek is empty', () => {
    expect(filterActivities(activities, { daysOfWeek: [] })).toHaveLength(6)
  })

  it('filters by inclusive distance bounds', () => {
    expect(
      ids(filterActivities(activities, { distanceMiles: { min: 20, max: 30 } })),
    ).toEqual(['activity-2024-saturday', 'activity-2025-wednesday'])
  })

  it('filters by inclusive elevation bounds', () => {
    expect(
      ids(filterActivities(activities, { elevationGainFeet: { min: 500, max: 1000 } })),
    ).toEqual(['activity-2024-saturday', 'activity-2025-wednesday'])
  })

  it('returns no matches when numeric min is greater than max', () => {
    expect(filterActivities(activities, { distanceMiles: { min: 30, max: 20 } })).toEqual(
      [],
    )
    expect(
      filterActivities(activities, { elevationGainFeet: { min: 1000, max: 500 } }),
    ).toEqual([])
  })

  it('filters by exact sportType', () => {
    expect(ids(filterActivities(activities, { sportType: 'GravelRide' }))).toEqual([
      'activity-2024-saturday',
    ])
  })

  it('does not constrain when sportType is blank', () => {
    expect(filterActivities(activities, { sportType: '' })).toHaveLength(6)
  })

  it('combines active filters with AND behavior', () => {
    const selection: ActivitySelection = {
      years: [2025],
      dateRange: { start: '2025-01-01', end: '2025-12-31' },
      recurringDateRange: {
        type: 'recurring-month-day',
        start: { month: 3, day: 1 },
        end: { month: 3, day: 31 },
      },
      dayMode: 'weekday',
      daysOfWeek: ['wednesday'],
      distanceMiles: { min: 25, max: 35 },
      elevationGainFeet: { min: 900, max: 1100 },
      sportType: 'Ride',
    }

    expect(ids(filterActivities(activities, selection))).toEqual(['activity-2025-wednesday'])
  })

  it('returns an empty array when no activities match', () => {
    expect(filterActivities(activities, { sportType: 'MountainBikeRide' })).toEqual([])
  })
})

function createActivity(overrides: {
  id: string
  localDate: string
  year: number
  dayOfWeek: DayOfWeek
  isWeekend: boolean
  distanceMiles: number
  elevationGainFeet: number
  sportType: string
}): Activity {
  return {
    id: overrides.id,
    startTime: `${overrides.localDate}T07:00:00-07:00`,
    localDate: overrides.localDate,
    year: overrides.year,
    month: Number(overrides.localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: overrides.dayOfWeek,
    isWeekend: overrides.isWeekend,
    distanceMiles: overrides.distanceMiles,
    movingTimeMinutes: 60,
    elapsedTimeMinutes: 65,
    averageSpeedMph: 15,
    elevationGainFeet: overrides.elevationGainFeet,
    sportType: overrides.sportType,
    trainer: false,
    commute: false,
    manual: false,
  }
}

function ids(filteredRides: readonly Activity[]): string[] {
  return filteredRides.map((activity) => activity.id)
}
