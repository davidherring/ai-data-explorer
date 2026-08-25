import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getMetricDefinition } from '../analysis/activityMetrics.ts'
import type { SeasonalMetricBucket } from '../analysis/seasonalMetrics.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { getSeasonalLineSegmentPoints } from './seasonalLineSegments.ts'
import { SeasonalMetricChart } from './SeasonalMetricChart.tsx'
import { formatSeasonalBucketTooltipTitle } from './chartTooltipText.ts'

describe('SeasonalMetricChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty selected activities', () => {
    renderChart([], 'averageSpeedMph', [], 2)

    expect(screen.getByLabelText('Average speed by season')).toBeInTheDocument()
    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific empty state when selected activities have no valid buckets', () => {
    renderChart([createActivity()], 'averageSpeedMph', [])

    expect(
      screen.getByText(
        'No activities have valid average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders the seasonal title, supporting text, and chart output', async () => {
    renderChart([createActivity()], 'averageSpeedMph', [
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
    renderChart([createActivity()], 'distanceMiles', [
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

    const tooltipText = formatSeasonalTooltip(
      createBucket({
        year: 2025,
        bucketIndex: 2,
        startWeek: 3,
        endWeek: 4,
        value: 31.44,
        sampleCount: 3,
      }),
      'distanceMiles',
    )

    expect(tooltipText).toContain('Year: 2025')
    expect(tooltipText).toContain('Weeks: 3-4')
    expect(tooltipText).toContain('Distance median: 31.4 mi')
    expect(tooltipText).toContain('Sample count: 3 activities')
    expect(getChartTitles()).toEqual([])
    expect(getCircleAriaLabels()).toContain(
      '2025, Weeks: 3-4, distance 31.4 mi, 3 activities',
    )
  })

  it('keeps sparse buckets visible as points with sparse tooltip text', async () => {
    renderChart([createActivity()], 'elevationGainFeet', [
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

    const tooltipText = formatSeasonalTooltip(
      createBucket({
        year: 2025,
        bucketIndex: 27,
        startWeek: 53,
        endWeek: 53,
        value: 1250,
        sampleCount: 1,
        sparse: true,
      }),
      'elevationGainFeet',
    )

    expect(tooltipText).toContain('Week: 53')
    expect(tooltipText).toContain('Elevation gain median: 1,250 ft')
    expect(tooltipText).toContain('Sample count: 1 activity')
    expect(tooltipText).toContain('Sparse bucket')
  })

  it('replaces Plot output when metric and buckets change', async () => {
    const { rerender } = renderChart([createActivity()], 'averageSpeedMph', [
      createBucket({ value: 15.2 }),
    ])

    await waitFor(() => {
      expect(getCircleAriaLabels().join('\n')).toContain(
        'average speed 15.2 mph',
      )
    })

    rerender(
      <SeasonalMetricChart
        activities={[createActivity()]}
        totalActivityCount={1}
        yMetric="distanceMiles"
        buckets={[createBucket({ value: 31.44 })]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Distance by season')).toBeInTheDocument()
    })

    expect(getCircleAriaLabels().join('\n')).toContain('distance 31.4 mi')
    expect(getCircleAriaLabels().join('\n')).not.toContain(
      'average speed 15.2 mph',
    )
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
  activities: Activity[],
  yMetric: MetricKey,
  buckets: SeasonalMetricBucket[],
  totalActivityCount = activities.length,
) {
  return render(
    <SeasonalMetricChart
      activities={activities}
      totalActivityCount={totalActivityCount}
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

function formatSeasonalTooltip(
  bucket: SeasonalMetricBucket,
  metric: MetricKey,
): string {
  return formatSeasonalBucketTooltipTitle(bucket, getMetricDefinition(metric))
}

function getCircleAriaLabels(): string[] {
  return Array.from(
    document.querySelectorAll('.seasonal-chart-container circle[aria-label]'),
  ).map((circle) => circle.getAttribute('aria-label') ?? '')
}

function getChartTitles(): string[] {
  return Array.from(
    document.querySelectorAll('.seasonal-chart-container title'),
  ).map((title) => title.textContent ?? '')
}

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
