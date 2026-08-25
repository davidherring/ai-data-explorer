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
    renderChart([activityA, activityB], 'averageSpeedMph')

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
    expect(document.body.textContent).toContain('Moving time: 126 min')
    expect(document.body.textContent).toContain('Activity type: Ride')
  })

  it('shows a year legend when valid plotted points span multiple years', async () => {
    renderChart([activityA, activityB], 'averageSpeedMph')

    await waitFor(() => {
      expect(getLegendSwatchLabels()).toEqual(['2025', '2026'])
    })
  })

  it('does not show a year legend for single-year plotted points', async () => {
    renderChart(
      [
        activityA,
        createActivity({
          id: 'activity-c',
          localDate: '2025-08-20',
          averageSpeedMph: 16,
        }),
      ],
      'averageSpeedMph',
    )

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(getLegendSwatchLabels()).toEqual([])
  })

  it('does not show a year legend when only one selected year has valid plotted points', async () => {
    renderChart(
      [
        activityA,
        createActivity({
          id: 'invalid-2026',
          localDate: '2026-08-20',
          averageSpeedMph: Number.NaN,
        }),
      ],
      'averageSpeedMph',
    )

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(getLegendSwatchLabels()).toEqual([])
  })

  it('renders a distance trend with metric title, accessibility, and tooltip', async () => {
    renderChart([activityA], 'distanceMiles')

    expect(screen.getByLabelText('Distance over calendar time')).toBeInTheDocument()
    expect(screen.getByText('Distance over calendar time')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(countTextOccurrences(document.body.textContent ?? '', 'Distance:')).toBe(1)
    expect(document.body.textContent).toContain('Moving time: 126 min')
  })

  it('renders an elevation trend with whole-number formatting', async () => {
    renderChart([activityA], 'elevationGainFeet')

    expect(
      screen.getByLabelText('Elevation gain over calendar time'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(countTextOccurrences(document.body.textContent ?? '', 'Elevation gain:')).toBe(1)
    expect(document.body.textContent).toContain('Moving time: 126 min')
  })

  it('renders a time metric trend with whole-number minute formatting', async () => {
    renderChart([activityA], 'movingTimeMinutes')

    expect(
      screen.getByLabelText('Moving time over calendar time'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Moving time: 126 min')
    expect(countTextOccurrences(document.body.textContent ?? '', 'Moving time:')).toBe(1)
  })

  it('does not plot non-finite active metric values', async () => {
    renderChart(
      [
        activityA,
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

  it('renders a metric-specific empty state when selected activities have no valid average speed', () => {
    renderChart(
      [
        createActivity({ id: 'nan-speed', averageSpeedMph: Number.NaN }),
        createActivity({ id: 'infinite-speed', averageSpeedMph: Number.POSITIVE_INFINITY }),
        createActivity({ id: 'negative-infinite-speed', averageSpeedMph: Number.NEGATIVE_INFINITY }),
      ],
      'averageSpeedMph',
    )

    expect(
      screen.getByText(
        'No activities have valid average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders valid average speed points while excluding invalid average speed activities', async () => {
    renderChart(
      [
        createActivity({
          id: 'valid-speed',
          localDate: '2025-06-01',
          averageSpeedMph: 72.4,
        }),
        createActivity({
          id: 'missing-speed',
          localDate: '2025-06-02',
          averageSpeedMph: Number.NaN,
        }),
      ],
      'averageSpeedMph',
    )

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-06-01')
    expect(document.body.textContent).toContain('Average speed: 72.4 mph')
    expect(document.body.textContent).not.toContain('2025-06-02')
  })

  it('replaces Plot output when the metric changes', async () => {
    const { rerender } = renderChart([activityA], 'averageSpeedMph')

    await waitFor(() => {
      expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    })

    rerender(
      <MetricTrendChart
        activities={[activityA]}
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
    const { rerender } = renderChart([activityA], 'averageSpeedMph')

    await waitFor(() => {
      expect(document.body.textContent).toContain('2025-03-12')
    })

    rerender(
      <MetricTrendChart
        activities={[activityB]}
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

function getLegendSwatchLabels(): string[] {
  return Array.from(document.querySelectorAll('span[class*="swatch"]')).map(
    (element) => element.textContent ?? '',
  )
}

const activityA = createActivity({
  id: 'activity-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const activityB = createActivity({
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
    averageSpeedMph: overrides.averageSpeedMph ?? 15.24,
    elevationGainFeet: overrides.elevationGainFeet ?? 1250,
    sportType: overrides.sportType ?? 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
