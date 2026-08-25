import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getMetricDefinition } from '../analysis/activityMetrics.ts'
import type { CumulativeMetricPoint } from '../analysis/cumulativeMetrics.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { CumulativeMetricChart } from './CumulativeMetricChart.tsx'
import { formatCumulativePointTooltipTitle } from './chartTooltipText.ts'

describe('CumulativeMetricChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty selected activities', () => {
    renderChart([], 'distanceMiles', [], 2)

    expect(screen.getByLabelText('Cumulative Distance')).toBeInTheDocument()
    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific empty state when selected activities have no valid points', () => {
    renderChart([createActivity()], 'averageSpeedMph', [])

    expect(
      screen.getByText(
        'No activities have valid average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders the cumulative title, supporting text, and chart output', async () => {
    renderChart([activityA, activityB], 'distanceMiles', [
      createPoint({ activity: activityA, value: 31.44, cumulativeValue: 31.44 }),
      createPoint({ activity: activityB, value: 42, cumulativeValue: 73.44 }),
    ])

    expect(screen.getByLabelText('Cumulative Distance')).toBeInTheDocument()
    expect(screen.getByText('Cumulative Distance')).toBeInTheDocument()
    expect(screen.getByText('Continuous accumulation')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })
  })

  it('uses metric metadata in tooltip text', async () => {
    renderChart([activityA], 'distanceMiles', [
      createPoint({ activity: activityA, value: 31.44, cumulativeValue: 31.44 }),
    ])

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    const tooltipText = formatCumulativeTooltip(
      createPoint({ activity: activityA, value: 31.44, cumulativeValue: 31.44 }),
      'distanceMiles',
    )

    expect(tooltipText).toContain('Date: 2025-03-12')
    expect(tooltipText).toContain('Activity Distance: 31.4 mi')
    expect(tooltipText).toContain('Cumulative Distance: 31.4 mi')
    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
    expect(tooltipText).toContain('Moving time: 126 min')
    expect(tooltipText).toContain('Activity type: Ride')
    expect(countTextOccurrences(tooltipText, 'Distance:')).toBe(2)
    expect(getChartTitles()).toEqual([])
    expect(getCircleAriaLabels()).toContain(
      '2025-03-12, distance 31.4 mi, cumulative distance 31.4 mi',
    )
  })

  it('renders non-default metric formatting and avoids duplicate elevation context', async () => {
    renderChart([activityA], 'elevationGainFeet', [
      createPoint({ activity: activityA, value: 1250, cumulativeValue: 1250 }),
    ])

    expect(screen.getByLabelText('Cumulative Elevation gain')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    const tooltipText = formatCumulativeTooltip(
      createPoint({ activity: activityA, value: 1250, cumulativeValue: 1250 }),
      'elevationGainFeet',
    )

    expect(tooltipText).toContain('Activity Elevation gain: 1,250 ft')
    expect(tooltipText).toContain('Cumulative Elevation gain: 1,250 ft')
    expect(tooltipText).toContain('Distance: 31.4 mi')
    expect(tooltipText).toContain('Moving time: 126 min')
    expect(countTextOccurrences(tooltipText, 'Elevation gain:')).toBe(2)
  })

  it('renders time metric values with context lines', async () => {
    renderChart([activityA], 'movingTimeMinutes', [
      createPoint({ activity: activityA, value: 125.6, cumulativeValue: 125.6 }),
    ])

    expect(screen.getByLabelText('Cumulative Moving time')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.cumulative-chart-container svg')).toBeInTheDocument()
    })

    const tooltipText = formatCumulativeTooltip(
      createPoint({ activity: activityA, value: 125.6, cumulativeValue: 125.6 }),
      'movingTimeMinutes',
    )

    expect(tooltipText).toContain('Activity Moving time: 126 min')
    expect(countTextOccurrences(tooltipText, 'Moving time:')).toBe(2)
    expect(tooltipText).toContain('Cumulative Moving time: 126 min')
    expect(tooltipText).toContain('Distance: 31.4 mi')
    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
  })

  it('replaces Plot output when metric and points change', async () => {
    const { rerender } = renderChart([activityA], 'distanceMiles', [
      createPoint({ activity: activityA, value: 31.44, cumulativeValue: 31.44 }),
    ])

    await waitFor(() => {
      expect(getCircleAriaLabels().join('\n')).toContain('distance 31.4 mi')
    })

    rerender(
      <CumulativeMetricChart
        activities={[activityA]}
        totalActivityCount={1}
        yMetric="elevationGainFeet"
        points={[createPoint({ activity: activityA, value: 1250, cumulativeValue: 1250 })]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Cumulative Elevation gain')).toBeInTheDocument()
    })

    expect(getCircleAriaLabels().join('\n')).toContain(
      'elevation gain 1,250 ft',
    )
    expect(getCircleAriaLabels().join('\n')).not.toContain(
      'cumulative distance 31.4 mi',
    )
    expect(document.querySelectorAll('.cumulative-chart-container svg')).toHaveLength(1)
  })
})

function renderChart(
  activities: Activity[],
  yMetric: MetricKey,
  points: CumulativeMetricPoint[],
  totalActivityCount = activities.length,
) {
  return render(
    <CumulativeMetricChart
      activities={activities}
      totalActivityCount={totalActivityCount}
      yMetric={yMetric}
      points={points}
    />,
  )
}

function createPoint(
  overrides: {
    activity: Activity
    value: number
    cumulativeValue: number
  },
): CumulativeMetricPoint {
  return {
    date: parseLocalCalendarDate(overrides.activity.localDate),
    localDate: overrides.activity.localDate,
    activityId: overrides.activity.id,
    activity: overrides.activity,
    value: overrides.value,
    cumulativeValue: overrides.cumulativeValue,
  }
}

function formatCumulativeTooltip(
  point: CumulativeMetricPoint,
  metric: MetricKey,
): string {
  return formatCumulativePointTooltipTitle(
    point,
    metric,
    getMetricDefinition(metric),
  )
}

function getCircleAriaLabels(): string[] {
  return Array.from(
    document.querySelectorAll('.cumulative-chart-container circle[aria-label]'),
  ).map((circle) => circle.getAttribute('aria-label') ?? '')
}

function getChartTitles(): string[] {
  return Array.from(
    document.querySelectorAll('.cumulative-chart-container title'),
  ).map((title) => title.textContent ?? '')
}

function countTextOccurrences(text: string, searchText: string): number {
  return text.split(searchText).length - 1
}

function parseLocalCalendarDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}

const activityA = createActivity({
  id: 'activity-a',
  localDate: '2025-03-12',
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const activityB = createActivity({
  id: 'activity-b',
  localDate: '2025-04-12',
  distanceMiles: 42,
  elevationGainFeet: 2200,
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
  > = {},
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
