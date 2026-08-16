import { describe, expect, it } from 'vitest'
import { loadDemoRides } from '../data/demoDataset.ts'

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

describe('demo ride dataset', () => {
  it('loads typed synthetic rides without sharing the fixture array reference', () => {
    const firstLoad = loadDemoRides()
    const secondLoad = loadDemoRides()

    expect(firstLoad).toHaveLength(12)
    expect(secondLoad).toHaveLength(12)
    expect(firstLoad).not.toBe(secondLoad)
  })

  it('contains variation needed for future date, seasonal, and metric tests', () => {
    const rides = loadDemoRides()

    expect(new Set(rides.map((ride) => ride.year)).size).toBeGreaterThanOrEqual(4)
    expect(new Set(rides.map((ride) => ride.month)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(rides.map((ride) => ride.weekOfYear)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(rides.map((ride) => ride.isWeekend)).size).toBe(2)
    expect(new Set(rides.map((ride) => ride.distanceMiles)).size).toBeGreaterThan(1)
    expect(new Set(rides.map((ride) => ride.elevationGainFeet)).size).toBeGreaterThan(1)
    expect(new Set(rides.map((ride) => ride.averageSpeedMph)).size).toBeGreaterThan(1)
    expect(rides.some((ride) => ride.temperatureF !== undefined)).toBe(true)
  })

  it('does not include private identifiers, route geometry, or raw Strava payloads', () => {
    const rides = loadDemoRides()

    for (const ride of rides) {
      expect(ride.id).toMatch(/^demo-ride-\d{3}$/)

      for (const field of privateOrLocationFields) {
        expect(ride).not.toHaveProperty(field)
      }
    }
  })
})
