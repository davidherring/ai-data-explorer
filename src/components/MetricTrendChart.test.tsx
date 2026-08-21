import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MetricTrendChart } from './MetricTrendChart.tsx'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'

describe('MetricTrendChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty activities', () => {
    renderChart([], 'averageSpeedMph', 2)

    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('preserves default average-speed behavior', async () => {
    renderChart([rideA, rideB], 'averageSpeedMph')

    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(screen.getByText('Average speed over calendar time')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Sport type: Ride')
  })

  it('renders a distance trend with metric title, accessibility, and tooltip', async () => {
    renderChart([rideA], 'distanceMiles')

    expect(screen.getByLabelText('Distance over calendar time')).toBeInTheDocument()
    expect(screen.getByText('Distance over calendar time')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(countTextOccurrences(document.body.textContent ?? '', 'Distance:')).toBe(1)
  })

  it('renders an elevation trend with whole-number formatting', async () => {
    renderChart([rideA], 'elevationGainFeet')

    expect(
      screen.getByLabelText('Elevation gain over calendar time'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(countTextOccurrences(document.body.textContent ?? '', 'Elevation gain:')).toBe(1)
  })

  it('renders a time metric trend with whole-number minute formatting', async () => {
    renderChart([rideA], 'movingTimeMinutes')

    expect(
      screen.getByLabelText('Moving time over calendar time'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Moving time: 126 min')
  })

  it('does not plot non-finite active metric values', async () => {
    renderChart(
      [
        rideA,
        createActivity({
          id: 'invalid-distance',
          localDate: '2025-04-01',
          distanceMiles: Number.NaN,
        }),
      ],
      'distanceMiles',
    )

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).not.toContain('2025-04-01')
  })

  it('renders a metric-specific empty state when selected activities have no valid temperature', () => {
    renderChart(
      [
        createActivity({ id: 'missing-temp', temperatureF: undefined }),
        createActivity({ id: 'nan-temp', temperatureF: Number.NaN }),
        createActivity({ id: 'infinite-temp', temperatureF: Number.POSITIVE_INFINITY }),
      ],
      'temperatureF',
    )

    expect(
      screen.getByText(
        'No activities have valid temperature values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders valid temperature points while excluding invalid temperature activities', async () => {
    renderChart(
      [
        createActivity({
          id: 'valid-temp',
          localDate: '2025-06-01',
          temperatureF: 72.4,
        }),
        createActivity({
          id: 'missing-temp',
          localDate: '2025-06-02',
          temperatureF: undefined,
        }),
      ],
      'temperatureF',
    )

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-06-01')
    expect(document.body.textContent).toContain('Temperature: 72 °F')
    expect(document.body.textContent).not.toContain('2025-06-02')
  })

  it('replaces Plot output when the metric changes', async () => {
    const { rerender } = renderChart([rideA], 'averageSpeedMph')

    await waitFor(() => {
      expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    })

    rerender(
      <MetricTrendChart
        activities={[rideA]}
        totalActivityCount={1}
        yMetric="distanceMiles"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Distance over calendar time')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).not.toContain('Average speed: 15.2 mph')
    expect(document.querySelectorAll('.trend-chart-container svg')).toHaveLength(1)
  })

  it('replaces Plot output when activities change', async () => {
    const { rerender } = renderChart([rideA], 'averageSpeedMph')

    await waitFor(() => {
      expect(document.body.textContent).toContain('2025-03-12')
    })

    rerender(
      <MetricTrendChart
        activities={[rideB]}
        totalActivityCount={1}
        yMetric="averageSpeedMph"
      />,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('2026-07-04')
    })

    expect(document.body.textContent).not.toContain('2025-03-12')
    expect(document.querySelectorAll('.trend-chart-container svg')).toHaveLength(1)
  })
})

function renderChart(
  activities: Activity[],
  yMetric: MetricKey,
  totalActivityCount = activities.length,
) {
  return render(
    <MetricTrendChart
      activities={activities}
      totalActivityCount={totalActivityCount}
      yMetric={yMetric}
    />,
  )
}

function countTextOccurrences(text: string, searchText: string): number {
  return text.split(searchText).length - 1
}

const rideA = createActivity({
  id: 'activity-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const rideB = createActivity({
  id: 'activity-b',
  localDate: '2026-07-04',
  averageSpeedMph: 16.01,
  distanceMiles: 42,
  elevationGainFeet: 2400,
  movingTimeMinutes: 143,
  sportType: 'GravelRide',
})

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
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
  >,
): Activity {
  const localDate = overrides.localDate ?? '2025-03-12'

  return {
    id: overrides.id ?? 'activity-a',
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
