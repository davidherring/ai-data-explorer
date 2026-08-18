import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'

describe('RelationshipScatterChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('preserves default elevation gain vs average speed behavior', async () => {
    renderChart([rideA, rideB, rideC])

    expect(
      screen.getByLabelText('Elevation gain vs Average speed'),
    ).toBeInTheDocument()
    expect(screen.getByText('Elevation gain vs Average speed')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Sport type: Ride')
  })

  it('renders an empty chart state for empty selected rides', () => {
    renderChart([])

    expect(
      screen.getByLabelText('Elevation gain vs Average speed'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No rides to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific invalid-pair state when selected rides have no valid pairs', () => {
    renderChart(
      [
        createRide({
          id: 'invalid-a',
          localDate: '2025-01-01',
          distanceMiles: Number.NaN,
          averageSpeedMph: 14,
        }),
        createRide({
          id: 'invalid-b',
          localDate: '2025-01-02',
          distanceMiles: 12,
          averageSpeedMph: Number.POSITIVE_INFINITY,
        }),
      ],
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(
      screen.getByText(
        'No rides have valid distance and average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a same-metric invalid-pair state with one metric label', () => {
    renderChart(
      [
        createRide({
          id: 'invalid-a',
          localDate: '2025-01-01',
          temperatureF: undefined,
        }),
        createRide({
          id: 'invalid-b',
          localDate: '2025-01-02',
          temperatureF: Number.NaN,
        }),
      ],
      'temperatureF',
      'temperatureF',
    )

    expect(
      screen.getByText(
        'No rides have valid temperature values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders one valid point with a sparse relationship message', async () => {
    renderChart([rideA])

    expect(
      screen.getByText('Too few valid rides to calculate Pearson r.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders two valid points with a sparse relationship message', async () => {
    renderChart([rideA, rideB])

    expect(
      screen.getByText('Too few valid rides to calculate Pearson r.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders a normal scatter plot for three or more valid points', async () => {
    renderChart([rideA, rideB, rideC])

    expect(
      screen.queryByText('Too few valid rides to calculate Pearson r.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '3 rides · Pearson r =',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders non-default distance vs average speed title and tooltip', async () => {
    renderChart([rideA, rideB, rideC], 'distanceMiles', 'averageSpeedMph')

    expect(
      screen.getByLabelText('Distance vs Average speed'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(countTextOccurrences(getPointTitleText('2025-03-12'), 'Distance:')).toBe(1)
  })

  it('renders moving time vs distance with metric formatting', async () => {
    renderChart([rideA, rideB, rideC], 'movingTimeMinutes', 'distanceMiles')

    expect(screen.getByLabelText('Moving time vs Distance')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Moving time: 126 min')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
  })

  it('renders same-metric pairs and shows the metric once in tooltip', async () => {
    renderChart([rideA, rideB, rideC], 'distanceMiles', 'distanceMiles')

    expect(screen.getByLabelText('Distance vs Distance')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('3 rides · Pearson r = 1.00')
    expect(countTextOccurrences(getPointTitleText('2025-03-12'), 'Distance:')).toBe(1)
  })

  it('does not duplicate elevation context when elevation is an active metric', async () => {
    renderChart([rideA, rideB, rideC], 'distanceMiles', 'elevationGainFeet')

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(
      countTextOccurrences(getPointTitleText('2025-03-12'), 'Elevation gain:'),
    ).toBe(1)
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

  it('renders observations when x variance is zero', async () => {
    renderChart(
      [
        createRide({ id: 'zero-x-a', localDate: '2025-01-01', distanceMiles: 20, averageSpeedMph: 12 }),
        createRide({ id: 'zero-x-b', localDate: '2025-01-02', distanceMiles: 20, averageSpeedMph: 14 }),
        createRide({ id: 'zero-x-c', localDate: '2025-01-03', distanceMiles: 20, averageSpeedMph: 16 }),
      ],
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Distance does not vary enough to calculate Pearson r.',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders observations when y variance is zero', async () => {
    renderChart(
      [
        createRide({ id: 'zero-y-a', localDate: '2025-01-01', distanceMiles: 10, movingTimeMinutes: 60 }),
        createRide({ id: 'zero-y-b', localDate: '2025-01-02', distanceMiles: 20, movingTimeMinutes: 60 }),
        createRide({ id: 'zero-y-c', localDate: '2025-01-03', distanceMiles: 30, movingTimeMinutes: 60 }),
      ],
      'distanceMiles',
      'movingTimeMinutes',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Moving time does not vary enough to calculate Pearson r.',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('replaces Plot output when the metric pair changes', async () => {
    const { rerender } = renderChart([rideA, rideB, rideC])

    await waitFor(() => {
      expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    })

    rerender(
      createChartElement(
        [rideA, rideB, rideC],
        'movingTimeMinutes',
        'distanceMiles',
      ),
    )

    await waitFor(() => {
      expect(screen.getByText('Moving time vs Distance')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Moving time: 126 min')
    expect(document.querySelectorAll('.relationship-chart-container svg')).toHaveLength(1)
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

function renderChart(
  rides: Ride[],
  xMetric: MetricKey = 'elevationGainFeet',
  yMetric: MetricKey = 'averageSpeedMph',
) {
  return render(createChartElement(rides, xMetric, yMetric))
}

function createChartElement(
  rides: Ride[],
  xMetric: MetricKey = 'elevationGainFeet',
  yMetric: MetricKey = 'averageSpeedMph',
) {
  return (
    <RelationshipScatterChart
      rides={rides}
      totalRideCount={rides.length}
      xMetric={xMetric}
      yMetric={yMetric}
      relationship={relationshipBetweenMetrics(rides, xMetric, yMetric)}
      points={getMetricRelationshipPoints(rides, xMetric, yMetric)}
    />
  )
}

function countTextOccurrences(text: string, searchText: string): number {
  return text.split(searchText).length - 1
}

function getPointTitleText(searchText: string): string {
  const title = Array.from(
    document.querySelectorAll('.relationship-chart-container title'),
  ).find((titleElement) => titleElement.textContent?.includes(searchText))

  if (!title) {
    throw new Error(`Expected point title containing ${searchText}`)
  }

  return title.textContent ?? ''
}

const rideA = createRide({
  id: 'ride-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const rideB = createRide({
  id: 'ride-b',
  localDate: '2025-06-14',
  averageSpeedMph: 14.87,
  distanceMiles: 42,
  elevationGainFeet: 2200,
  movingTimeMinutes: 143,
  sportType: 'GravelRide',
})

const rideC = createRide({
  id: 'ride-c',
  localDate: '2025-09-20',
  averageSpeedMph: 16.1,
  distanceMiles: 25.5,
  elevationGainFeet: 700,
  movingTimeMinutes: 95,
  sportType: 'Ride',
})

const rideD = createRide({
  id: 'ride-d',
  localDate: '2026-07-04',
  averageSpeedMph: 16.01,
  distanceMiles: 40,
  elevationGainFeet: 1000,
  movingTimeMinutes: 130,
  sportType: 'Ride',
})

const rideE = createRide({
  id: 'ride-e',
  localDate: '2026-08-04',
  averageSpeedMph: 15.2,
  distanceMiles: 38,
  elevationGainFeet: 1300,
  movingTimeMinutes: 132,
  sportType: 'Ride',
})

const rideF = createRide({
  id: 'ride-f',
  localDate: '2026-09-04',
  averageSpeedMph: 14.9,
  distanceMiles: 37,
  elevationGainFeet: 1600,
  movingTimeMinutes: 149,
  sportType: 'Ride',
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
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 65,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    temperatureF: overrides.temperatureF,
    sportType: overrides.sportType ?? 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
