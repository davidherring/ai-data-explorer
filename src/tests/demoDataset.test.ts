import { describe, expect, it } from 'vitest'
import { loadDemoActivities } from '../data/demoDataset.ts'
import type { Activity, DayOfWeek } from '../data/activity.ts'

const privateOrLocationFields = [
  'athlete',
  'athleteId',
  'sourceActivityId',
  'startLatlng',
  'endLatlng',
  'startLatitude',
  'startLongitude',
  'endLatitude',
  'endLongitude',
  'map',
  'polyline',
  'summaryPolyline',
  'raw',
  'rawStrava',
]
const normalizedActivityFields = [
  'id',
  'startTime',
  'localDate',
  'year',
  'month',
  'weekOfYear',
  'dayOfWeek',
  'isWeekend',
  'distanceMiles',
  'movingTimeMinutes',
  'averageSpeedMph',
  'elevationGainFeet',
  'sportType',
  'trainer',
  'commute',
  'manual',
] as const satisfies readonly (keyof Activity)[]
const dayOfWeeks = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly DayOfWeek[]

describe('demo activity dataset', () => {
  it('loads sanitized demo activities without sharing object references', () => {
    const firstLoad = loadDemoActivities()
    const secondLoad = loadDemoActivities()

    expect(firstLoad.length).toBeGreaterThanOrEqual(900)
    expect(firstLoad.length).toBeLessThanOrEqual(1_000)
    expect(secondLoad).toHaveLength(firstLoad.length)
    expect(firstLoad).not.toBe(secondLoad)
    expect(firstLoad[0]).not.toBe(secondLoad[0])
  })

  it('contains variation needed for visualization and AI analysis', () => {
    const activities = loadDemoActivities()

    expect(new Set(activities.map((activity) => activity.year)).size).toBeGreaterThanOrEqual(4)
    expect(new Set(activities.map((activity) => activity.month)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(activities.map((activity) => activity.weekOfYear)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(activities.map((activity) => activity.isWeekend)).size).toBe(2)
    expect(new Set(activities.map((activity) => activity.distanceMiles)).size).toBeGreaterThan(1)
    expect(new Set(activities.map((activity) => activity.elevationGainFeet)).size).toBeGreaterThan(1)
    expect(new Set(activities.map((activity) => activity.averageSpeedMph)).size).toBeGreaterThan(1)
    expect(new Set(activities.map((activity) => activity.movingTimeMinutes)).size).toBeGreaterThan(1)
  })

  it('contains only Ride and Walk activities and excludes EBikeRide', () => {
    const activities = loadDemoActivities()
    const sportTypes = new Set(activities.map((activity) => activity.sportType))

    expect(sportTypes).toEqual(new Set(['Ride', 'Walk']))
    expect(sportTypes.has('EBikeRide')).toBe(false)
  })

  it('uses deterministic unique sequential demo ids', () => {
    const activities = loadDemoActivities()
    const ids = activities.map((activity) => activity.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(
      activities.map(
        (_activity, index) =>
          `demo-activity-${String(index + 1).padStart(4, '0')}`,
      ),
    )
  })

  it('validates every activity against the normalized Activity contract', () => {
    const activities = loadDemoActivities()

    for (const activity of activities) {
      expect(Object.keys(activity).sort()).toEqual(
        [...normalizedActivityFields].sort(),
      )
      expect(activity.id).toMatch(/^demo-activity-\d{4}$/)
      expect(activity.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(activity.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(activity.year).toBe(Number(activity.localDate.slice(0, 4)))
      expect(activity.month).toBe(Number(activity.localDate.slice(5, 7)))
      expect(activity.weekOfYear).toBeGreaterThanOrEqual(1)
      expect(activity.weekOfYear).toBeLessThanOrEqual(53)
      expect(dayOfWeeks).toContain(activity.dayOfWeek)
      expect(activity.isWeekend).toBe(
        activity.dayOfWeek === 'saturday' || activity.dayOfWeek === 'sunday',
      )
      expect(Number.isFinite(activity.distanceMiles)).toBe(true)
      expect(Number.isFinite(activity.movingTimeMinutes)).toBe(true)
      expect(Number.isFinite(activity.averageSpeedMph)).toBe(true)
      expect(Number.isFinite(activity.elevationGainFeet)).toBe(true)
      expect(typeof activity.trainer).toBe('boolean')
      expect(typeof activity.commute).toBe('boolean')
      expect(typeof activity.manual).toBe('boolean')

      for (const field of privateOrLocationFields) {
        expect(activity).not.toHaveProperty(field)
      }
    }
  })
})
