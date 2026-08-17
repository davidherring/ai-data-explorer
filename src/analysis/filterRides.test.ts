import { describe, expect, it } from 'vitest'
import { filterRides } from './filterRides.ts'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { ActivitySelection } from '../state/analysisState.ts'

const rides: Ride[] = [
  createRide({
    id: 'ride-2024-monday',
    localDate: '2024-01-01',
    year: 2024,
    dayOfWeek: 'monday',
    isWeekend: false,
    distanceMiles: 10,
    elevationGainFeet: 100,
    sportType: 'Ride',
  }),
  createRide({
    id: 'ride-2024-saturday',
    localDate: '2024-06-15',
    year: 2024,
    dayOfWeek: 'saturday',
    isWeekend: true,
    distanceMiles: 20,
    elevationGainFeet: 500,
    sportType: 'GravelRide',
  }),
  createRide({
    id: 'ride-2025-wednesday',
    localDate: '2025-03-12',
    year: 2025,
    dayOfWeek: 'wednesday',
    isWeekend: false,
    distanceMiles: 30,
    elevationGainFeet: 1000,
    sportType: 'Ride',
  }),
  createRide({
    id: 'ride-2025-sunday',
    localDate: '2025-12-28',
    year: 2025,
    dayOfWeek: 'sunday',
    isWeekend: true,
    distanceMiles: 40,
    elevationGainFeet: 1500,
    sportType: 'VirtualRide',
  }),
]

describe('filterRides', () => {
  it('returns all rides when no filters are active', () => {
    expect(ids(filterRides(rides, {}))).toEqual([
      'ride-2024-monday',
      'ride-2024-saturday',
      'ride-2025-wednesday',
      'ride-2025-sunday',
    ])
  })

  it('returns a new array and preserves source order', () => {
    const result = filterRides(rides, { years: [2024, 2025] })

    expect(result).not.toBe(rides)
    expect(result).toEqual(rides)
    expect(ids(result)).toEqual(ids(rides))
  })

  it('does not mutate the input array or ride objects', () => {
    const originalOrder = [...rides]
    const originalRide = { ...rides[0] }

    filterRides(rides, { years: [2025], distanceMiles: { min: 30 } })

    expect(rides).toEqual(originalOrder)
    expect(rides[0]).toEqual(originalRide)
  })

  it('filters by years', () => {
    expect(ids(filterRides(rides, { years: [2025] }))).toEqual([
      'ride-2025-wednesday',
      'ride-2025-sunday',
    ])
  })

  it('does not constrain when years is empty', () => {
    expect(filterRides(rides, { years: [] })).toHaveLength(4)
  })

  it('filters by inclusive date range bounds', () => {
    expect(
      ids(
        filterRides(rides, {
          dateRange: { start: '2024-06-15', end: '2025-03-12' },
        }),
      ),
    ).toEqual(['ride-2024-saturday', 'ride-2025-wednesday'])
  })

  it('filters by date start only', () => {
    expect(
      ids(filterRides(rides, { dateRange: { start: '2025-01-01' } })),
    ).toEqual(['ride-2025-wednesday', 'ride-2025-sunday'])
  })

  it('filters by date end only', () => {
    expect(
      ids(filterRides(rides, { dateRange: { end: '2024-12-31' } })),
    ).toEqual(['ride-2024-monday', 'ride-2024-saturday'])
  })

  it('intersects year and date range filters', () => {
    expect(
      ids(
        filterRides(rides, {
          years: [2024],
          dateRange: { start: '2024-06-01' },
        }),
      ),
    ).toEqual(['ride-2024-saturday'])
  })

  it('filters by dayMode', () => {
    expect(ids(filterRides(rides, { dayMode: 'all' }))).toEqual(ids(rides))
    expect(ids(filterRides(rides, { dayMode: 'weekday' }))).toEqual([
      'ride-2024-monday',
      'ride-2025-wednesday',
    ])
    expect(ids(filterRides(rides, { dayMode: 'weekend' }))).toEqual([
      'ride-2024-saturday',
      'ride-2025-sunday',
    ])
  })

  it('filters by daysOfWeek', () => {
    expect(
      ids(filterRides(rides, { daysOfWeek: ['wednesday', 'sunday'] })),
    ).toEqual(['ride-2025-wednesday', 'ride-2025-sunday'])
  })

  it('does not constrain when daysOfWeek is empty', () => {
    expect(filterRides(rides, { daysOfWeek: [] })).toHaveLength(4)
  })

  it('filters by inclusive distance bounds', () => {
    expect(
      ids(filterRides(rides, { distanceMiles: { min: 20, max: 30 } })),
    ).toEqual(['ride-2024-saturday', 'ride-2025-wednesday'])
  })

  it('filters by inclusive elevation bounds', () => {
    expect(
      ids(filterRides(rides, { elevationGainFeet: { min: 500, max: 1000 } })),
    ).toEqual(['ride-2024-saturday', 'ride-2025-wednesday'])
  })

  it('returns no matches when numeric min is greater than max', () => {
    expect(filterRides(rides, { distanceMiles: { min: 30, max: 20 } })).toEqual(
      [],
    )
    expect(
      filterRides(rides, { elevationGainFeet: { min: 1000, max: 500 } }),
    ).toEqual([])
  })

  it('filters by exact sportType', () => {
    expect(ids(filterRides(rides, { sportType: 'GravelRide' }))).toEqual([
      'ride-2024-saturday',
    ])
  })

  it('does not constrain when sportType is blank', () => {
    expect(filterRides(rides, { sportType: '' })).toHaveLength(4)
  })

  it('combines active filters with AND behavior', () => {
    const selection: ActivitySelection = {
      years: [2025],
      dayMode: 'weekday',
      daysOfWeek: ['wednesday'],
      distanceMiles: { min: 25, max: 35 },
      elevationGainFeet: { min: 900, max: 1100 },
      sportType: 'Ride',
    }

    expect(ids(filterRides(rides, selection))).toEqual(['ride-2025-wednesday'])
  })

  it('returns an empty array when no rides match', () => {
    expect(filterRides(rides, { sportType: 'MountainBikeRide' })).toEqual([])
  })
})

function createRide(overrides: {
  id: string
  localDate: string
  year: number
  dayOfWeek: DayOfWeek
  isWeekend: boolean
  distanceMiles: number
  elevationGainFeet: number
  sportType: string
}): Ride {
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

function ids(filteredRides: readonly Ride[]): string[] {
  return filteredRides.map((ride) => ride.id)
}
