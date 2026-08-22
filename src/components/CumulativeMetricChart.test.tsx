import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CumulativeMetricPoint } from '../analysis/cumulativeMetrics.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { CumulativeMetricChart } from './CumulativeMetricChart.tsx'

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
    renderChart([rideA, rideB], 'distanceMiles', [
      createPoint({ activity: rideA, value: 31.44, cumulativeValue: 31.44 }),
      createPoint({ activity: rideB, value: 42, cumulativeValue: 73.44 }),
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
      createPoint({ activity: rideA, value: 31.44, cumulativeValue: 31.44 }),
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
      createPoint({ activity: rideA, value: 1250, cumulativeValue: 1250 }),
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
      createPoint({ activity: rideA, value: 125.6, cumulativeValue: 125.6 }),
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
      createPoint({ activity: rideA, value: 31.44, cumulativeValue: 31.44 }),
    ])

    await waitFor(() => {
      expect(document.body.textContent).toContain('Distance: 31.4 mi')
    })

    rerender(
      <CumulativeMetricChart
        activities={[rideA]}
        totalActivityCount={1}
        yMetric="elevationGainFeet"
        points={[createPoint({ activity: rideA, value: 1250, cumulativeValue: 1250 })]}
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

const rideA = createActivity({
  id: 'activity-a',
  localDate: '2025-03-12',
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const rideB = createActivity({
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
