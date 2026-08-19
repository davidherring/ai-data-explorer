import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { SeasonalMetricBucket } from '../analysis/seasonalMetrics.ts'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getSeasonalLineSegmentPoints } from './seasonalLineSegments.ts'
import { SeasonalMetricChart } from './SeasonalMetricChart.tsx'

describe('SeasonalMetricChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty selected rides', () => {
    renderChart([], 'averageSpeedMph', [], 2)

    expect(screen.getByLabelText('Average speed by season')).toBeInTheDocument()
    expect(
      screen.getByText('No rides to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific empty state when selected rides have no valid buckets', () => {
    renderChart([createRide()], 'temperatureF', [])

    expect(
      screen.getByText(
        'No rides have valid temperature values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders the seasonal title, supporting text, and chart output', async () => {
    renderChart([createRide()], 'averageSpeedMph', [
      createBucket({ year: 2025, bucketIndex: 6, startWeek: 11, endWeek: 12 }),
      createBucket({ year: 2026, bucketIndex: 6, startWeek: 11, endWeek: 12 }),
    ])

    expect(screen.getByLabelText('Average speed by season')).toBeInTheDocument()
    expect(screen.getByText('Average speed by season')).toBeInTheDocument()
    expect(screen.getByText('Biweekly median by year')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.seasonal-chart-container svg')).toBeInTheDocument()
    })
  })

  it('uses metric metadata in tooltip text', async () => {
    renderChart([createRide()], 'distanceMiles', [
      createBucket({
        year: 2025,
        bucketIndex: 2,
        startWeek: 3,
        endWeek: 4,
        value: 31.44,
        sampleCount: 3,
      }),
    ])

    expect(screen.getByLabelText('Distance by season')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.seasonal-chart-container svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Year: 2025')
    expect(document.body.textContent).toContain('Weeks: 3-4')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Sample count: 3 rides')
  })

  it('keeps sparse buckets visible as points with sparse tooltip text', async () => {
    renderChart([createRide()], 'elevationGainFeet', [
      createBucket({
        year: 2025,
        bucketIndex: 27,
        startWeek: 53,
        endWeek: 53,
        value: 1250,
        sampleCount: 1,
        sparse: true,
      }),
    ])

    await waitFor(() => {
      expect(document.querySelector('.seasonal-chart-container svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Week: 53')
    expect(document.body.textContent).toContain('Elevation gain: 1,250 ft')
    expect(document.body.textContent).toContain('Sample count: 1 ride')
    expect(document.body.textContent).toContain('Sparse bucket')
  })

  it('replaces Plot output when metric and buckets change', async () => {
    const { rerender } = renderChart([createRide()], 'averageSpeedMph', [
      createBucket({ value: 15.2 }),
    ])

    await waitFor(() => {
      expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    })

    rerender(
      <SeasonalMetricChart
        rides={[createRide()]}
        totalRideCount={1}
        yMetric="distanceMiles"
        buckets={[createBucket({ value: 31.44 })]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Distance by season')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).not.toContain('Average speed: 15.2 mph')
    expect(document.querySelectorAll('.seasonal-chart-container svg').length).toBeGreaterThan(0)
  })
})

describe('getSeasonalLineSegmentPoints', () => {
  it('connects adjacent non-sparse buckets within the same year', () => {
    const segmentPoints = getSeasonalLineSegmentPoints([
      createBucket({ year: 2025, bucketIndex: 1, sparse: false }),
      createBucket({ year: 2025, bucketIndex: 2, sparse: false }),
      createBucket({ year: 2026, bucketIndex: 1, sparse: false }),
      createBucket({ year: 2026, bucketIndex: 2, sparse: false }),
    ])

    expect(segmentPoints.map((point) => point.segmentId)).toEqual([
      '2025:1-2',
      '2025:1-2',
      '2026:1-2',
      '2026:1-2',
    ])
  })

  it('does not bridge sparse buckets or missing bucket gaps', () => {
    const segmentPoints = getSeasonalLineSegmentPoints([
      createBucket({ year: 2025, bucketIndex: 1, sparse: false }),
      createBucket({ year: 2025, bucketIndex: 2, sparse: true }),
      createBucket({ year: 2025, bucketIndex: 3, sparse: false }),
      createBucket({ year: 2025, bucketIndex: 5, sparse: false }),
      createBucket({ year: 2025, bucketIndex: 6, sparse: false }),
    ])

    expect(segmentPoints.map((point) => point.segmentId)).toEqual([
      '2025:5-6',
      '2025:5-6',
    ])
  })

  it('sorts buckets within each year before building segments', () => {
    const segmentPoints = getSeasonalLineSegmentPoints([
      createBucket({ year: 2025, bucketIndex: 2, sparse: false }),
      createBucket({ year: 2025, bucketIndex: 1, sparse: false }),
    ])

    expect(segmentPoints.map((point) => point.bucketIndex)).toEqual([1, 2])
    expect(segmentPoints.map((point) => point.segmentId)).toEqual([
      '2025:1-2',
      '2025:1-2',
    ])
  })
})

function renderChart(
  rides: Ride[],
  yMetric: MetricKey,
  buckets: SeasonalMetricBucket[],
  totalRideCount = rides.length,
) {
  return render(
    <SeasonalMetricChart
      rides={rides}
      totalRideCount={totalRideCount}
      yMetric={yMetric}
      buckets={buckets}
    />,
  )
}

function createBucket(
  overrides: Partial<SeasonalMetricBucket> = {},
): SeasonalMetricBucket {
  const bucketIndex = overrides.bucketIndex ?? 6
  const startWeek = overrides.startWeek ?? (bucketIndex - 1) * 2 + 1

  return {
    year: overrides.year ?? 2025,
    bucketIndex,
    startWeek,
    endWeek: overrides.endWeek ?? Math.min(startWeek + 1, 53),
    value: overrides.value ?? 15.2,
    sampleCount: overrides.sampleCount ?? 2,
    sparse: overrides.sparse ?? false,
  }
}

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
