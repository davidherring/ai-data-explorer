import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'

describe('RelationshipScatterChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty selected rides', () => {
    renderChart([])

    expect(screen.getByLabelText('Elevation gain vs average speed')).toBeInTheDocument()
    expect(
      screen.getByText('No rides to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders an invalid-pair state when selected rides have no valid pairs', () => {
    renderChart([
      createRide({
        id: 'invalid-a',
        localDate: '2025-01-01',
        elevationGainFeet: Number.NaN,
        averageSpeedMph: 14,
      }),
      createRide({
        id: 'invalid-b',
        localDate: '2025-01-02',
        elevationGainFeet: 1200,
        averageSpeedMph: Number.POSITIVE_INFINITY,
      }),
    ])

    expect(
      screen.getByText('No rides have valid elevation and speed values.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders one valid point with a sparse relationship message', async () => {
    renderChart([rideA])

    expect(
      screen.getByText('Too few valid rides to analyze this relationship.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders two valid points with a sparse relationship message', async () => {
    renderChart([rideA, rideB])

    expect(
      screen.getByText('Too few valid rides to analyze this relationship.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders a normal scatter plot for three or more valid points', async () => {
    renderChart([rideA, rideB, rideC])

    expect(
      screen.queryByText('Too few valid rides to analyze this relationship.'),
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('preserves localDate and ride details in native tooltip text', async () => {
    renderChart([rideA, rideB, rideC])

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation: 1,250 ft')
    expect(document.body.textContent).toContain('Sport type: Ride')
  })

  it('does not include invalid rides in plotted tooltip data', async () => {
    renderChart([
      rideA,
      createRide({
        id: 'invalid-a',
        localDate: '2025-04-01',
        elevationGainFeet: Number.NaN,
        averageSpeedMph: 99,
      }),
      rideB,
      rideC,
    ])

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).not.toContain('2025-04-01')
    expect(document.body.textContent).not.toContain('Average speed: 99.0 mph')
  })

  it('replaces Plot output when rides change', async () => {
    const { rerender } = renderChart([rideA, rideB, rideC])

    await waitFor(() => {
      expect(document.body.textContent).toContain('2025-03-12')
    })

    rerender(createChartElement([rideD, rideE, rideF]))

    await waitFor(() => {
      expect(document.body.textContent).toContain('2026-07-04')
    })

    expect(document.body.textContent).not.toContain('2025-03-12')
    expect(document.querySelectorAll('.relationship-chart-container svg')).toHaveLength(1)
  })
})

const rideA = createRide({
  id: 'ride-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  sportType: 'Ride',
})

const rideB = createRide({
  id: 'ride-b',
  localDate: '2025-06-14',
  averageSpeedMph: 14.87,
  distanceMiles: 42,
  elevationGainFeet: 2200,
  sportType: 'GravelRide',
})

const rideC = createRide({
  id: 'ride-c',
  localDate: '2025-09-20',
  averageSpeedMph: 16.1,
  distanceMiles: 25.5,
  elevationGainFeet: 700,
  sportType: 'Ride',
})

const rideD = createRide({
  id: 'ride-d',
  localDate: '2026-07-04',
  averageSpeedMph: 16.01,
  distanceMiles: 40,
  elevationGainFeet: 1000,
  sportType: 'Ride',
})

const rideE = createRide({
  id: 'ride-e',
  localDate: '2026-08-04',
  averageSpeedMph: 15.2,
  distanceMiles: 38,
  elevationGainFeet: 1300,
  sportType: 'Ride',
})

const rideF = createRide({
  id: 'ride-f',
  localDate: '2026-09-04',
  averageSpeedMph: 14.9,
  distanceMiles: 37,
  elevationGainFeet: 1600,
  sportType: 'Ride',
})

function renderChart(rides: Ride[]) {
  return render(createChartElement(rides))
}

function createChartElement(rides: Ride[]) {
  return (
    <RelationshipScatterChart
      rides={rides}
      totalRideCount={rides.length}
      relationship={relationshipBetweenMetrics(
        rides,
        'elevationGainFeet',
        'averageSpeedMph',
      )}
      points={getMetricRelationshipPoints(
        rides,
        'elevationGainFeet',
        'averageSpeedMph',
      )}
    />
  )
}

function createRide(
  overrides: {
    id: string
    localDate: string
    averageSpeedMph: number
    distanceMiles?: number
    elevationGainFeet: number
    sportType?: string
  },
): Ride {
  return {
    id: overrides.id,
    startTime: `${overrides.localDate}T07:00:00-07:00`,
    localDate: overrides.localDate,
    year: Number(overrides.localDate.slice(0, 4)),
    month: Number(overrides.localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: 60,
    elapsedTimeMinutes: 65,
    averageSpeedMph: overrides.averageSpeedMph,
    elevationGainFeet: overrides.elevationGainFeet,
    sportType: overrides.sportType ?? 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
