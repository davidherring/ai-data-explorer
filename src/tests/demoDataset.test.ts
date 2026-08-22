import { describe, expect, it } from 'vitest'
import { loadDemoActivities } from '../data/demoDataset.ts'

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

describe('demo activity dataset', () => {
  it('loads typed synthetic activities without sharing the fixture array reference', () => {
    const firstLoad = loadDemoActivities()
    const secondLoad = loadDemoActivities()

    expect(firstLoad).toHaveLength(12)
    expect(secondLoad).toHaveLength(12)
    expect(firstLoad).not.toBe(secondLoad)
  })

  it('contains variation needed for future date, seasonal, and metric tests', () => {
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

  it('does not include private identifiers, route geometry, or raw Strava payloads', () => {
    const activities = loadDemoActivities()

    for (const activity of activities) {
      expect(activity.id).toMatch(/^demo-activity-\d{3}$/)

      for (const field of privateOrLocationFields) {
        expect(activity).not.toHaveProperty(field)
      }
    }
  })
})
