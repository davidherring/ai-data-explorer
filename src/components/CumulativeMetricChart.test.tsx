import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CumulativeMetricPoint } from '../analysis/cumulativeMetrics.ts'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { CumulativeMetricChart } from './CumulativeMetricChart.tsx'

describe('CumulativeMetricChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty selected rides', () => {
    renderChart([], 'distanceMiles', [], 2)

    expect(screen.getByLabelText('Cumulative Distance')).toBeInTheDocument()
    expect(
      screen.getByText('No rides to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific empty state when selected rides have no valid points', () => {
    renderChart([createRide()], 'temperatureF', [])

    expect(
      screen.getByText(
        'No rides have valid temperature values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders the cumulative title, supporting text, and chart output', async () => {
    renderChart([rideA, rideB], 'distanceMiles', [
      createPoint({ ride: rideA, value: 31.44, cumulativeValue: 31.44 }),
      createPoint({ ride: rideB, value: 42, cumulativeValue: 73.44 }),
    ])

    expect(screen.getByLabelText('Cumulative Distance')).toBeInTheDocument()
    expect(screen.getByText('Cumulative Distance')).toBeInTheDocument()
    expect(screen.getByText('Continuous accumulation')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })
  })

  it('uses metric metadata in tooltip text', async () => {
    renderChart([rideA], 'distanceMiles', [
      createPoint({ ride: rideA, value: 31.44, cumulativeValue: 31.44 }),
    ])

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Cumulative Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Sport type: Ride')
    expect(getPointTitleText('2025-03-12')).not.toContain('\nDistance: 31.4 mi\nDistance:')
  })

  it('renders non-default metric formatting and avoids duplicate elevation context', async () => {
    renderChart([rideA], 'elevationGainFeet', [
      createPoint({ ride: rideA, value: 1250, cumulativeValue: 1250 }),
    ])

    expect(screen.getByLabelText('Cumulative Elevation gain')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    const titleText = getPointTitleText('2025-03-12')

    expect(titleText).toContain('Elevation gain: 1,250 ft')
    expect(titleText).toContain('Cumulative Elevation gain: 1,250 ft')
    expect(titleText).toContain('Distance: 31.4 mi')
    expect(titleText).not.toContain(
      '\nElevation gain: 1,250 ft\nElevation gain:',
    )
  })

  it('renders time metric values with context lines', async () => {
    renderChart([rideA], 'movingTimeMinutes', [
      createPoint({ ride: rideA, value: 125.6, cumulativeValue: 125.6 }),
    ])

    expect(screen.getByLabelText('Cumulative Moving time')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Moving time: 126 min')
    expect(document.body.textContent).toContain('Cumulative Moving time: 126 min')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
  })

  it('replaces Plot output when metric and points change', async () => {
    const { rerender } = renderChart([rideA], 'distanceMiles', [
      createPoint({ ride: rideA, value: 31.44, cumulativeValue: 31.44 }),
    ])

    await waitFor(() => {
      expect(document.body.textContent).toContain('Distance: 31.4 mi')
    })

    rerender(
      <CumulativeMetricChart
        rides={[rideA]}
        totalRideCount={1}
        yMetric="elevationGainFeet"
        points={[createPoint({ ride: rideA, value: 1250, cumulativeValue: 1250 })]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Cumulative Elevation gain')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).not.toContain('Cumulative Distance: 31.4 mi')
    expect(document.querySelectorAll('.cumulative-chart-container svg')).toHaveLength(1)
  })
})

function renderChart(
  rides: Ride[],
  yMetric: MetricKey,
  points: CumulativeMetricPoint[],
  totalRideCount = rides.length,
) {
  return render(
    <CumulativeMetricChart
      rides={rides}
      totalRideCount={totalRideCount}
      yMetric={yMetric}
      points={points}
    />,
  )
}

function createPoint(
  overrides: {
    ride: Ride
    value: number
    cumulativeValue: number
  },
): CumulativeMetricPoint {
  return {
    date: parseLocalCalendarDate(overrides.ride.localDate),
    localDate: overrides.ride.localDate,
    rideId: overrides.ride.id,
    ride: overrides.ride,
    value: overrides.value,
    cumulativeValue: overrides.cumulativeValue,
  }
}

function getPointTitleText(searchText: string): string {
  const title = Array.from(
    document.querySelectorAll('.cumulative-chart-container title'),
  ).find((titleElement) => titleElement.textContent?.includes(searchText))

  if (!title) {
    throw new Error(`Expected point title containing ${searchText}`)
  }

  return title.textContent ?? ''
}

function parseLocalCalendarDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}

const rideA = createRide({
  id: 'ride-a',
  localDate: '2025-03-12',
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const rideB = createRide({
  id: 'ride-b',
  localDate: '2025-04-12',
  distanceMiles: 42,
  elevationGainFeet: 2200,
  movingTimeMinutes: 143,
  sportType: 'GravelRide',
})

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'id'
      | 'localDate'
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
      | 'sportType'
    >
  > = {},
): Ride {
  const localDate = overrides.localDate ?? '2025-03-12'

  return {
    id: overrides.id ?? 'ride-a',
    startTime: `${localDate}T07:00:00-07:00`,
    localDate,
    year: Number(localDate.slice(0, 4)),
    month: Number(localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 31.44,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 65,
    averageSpeedMph: overrides.averageSpeedMph ?? 15.24,
    elevationGainFeet: overrides.elevationGainFeet ?? 1250,
    temperatureF: overrides.temperatureF,
    sportType: overrides.sportType ?? 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
