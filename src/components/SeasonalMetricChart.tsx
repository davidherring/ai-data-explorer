import * as Plot from '@observablehq/plot'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SeasonalMetricBucket } from '../analysis/seasonalMetrics.ts'
import {
  getMetricDefinition,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import { SelectionStatus } from './SelectionStatus.tsx'
import {
  getSeasonalLineSegmentPoints,
  type SeasonalLineSegmentPoint,
} from './seasonalLineSegments.ts'
import type { Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { formatMetricValue } from './chartTooltipText.ts'

type SeasonalMetricChartProps = {
  activities: Activity[]
  totalActivityCount: number
  yMetric: MetricKey
  buckets: SeasonalMetricBucket[]
  viewControls?: ReactNode
  metricControls?: ReactNode
}

const fallbackChartWidth = 720
const chartHeight = 320

export function SeasonalMetricChart({
  activities,
  totalActivityCount,
  yMetric,
  buckets,
  viewControls,
  metricControls,
}: SeasonalMetricChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const metricDefinition = getMetricDefinition(yMetric)
  const chartLabel = `${metricDefinition.label} by season`
  const lineSegmentPoints = useMemo(
    () => getSeasonalLineSegmentPoints(buckets),
    [buckets],
  )
  const hasNoSelectedActivities = activities.length === 0
  const hasNoValidMetricValues = activities.length > 0 && buckets.length === 0

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const measureContainer = () => {
      const measuredWidth = Math.floor(container.getBoundingClientRect().width)

      if (measuredWidth > 0) {
        setChartWidth(measuredWidth)
      }
    }

    measureContainer()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const measuredWidth = Math.floor(entry.contentRect.width)

      if (measuredWidth > 0) {
        setChartWidth(measuredWidth)
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current

    if (!container || buckets.length === 0) {
      return
    }

    const plot = Plot.plot({
      width: Math.max(320, chartWidth),
      height: chartHeight,
      marginTop: 24,
      marginRight: 24,
      marginBottom: 48,
      marginLeft: 56,
      style: {
        background: 'transparent',
        color: '#172026',
        fontFamily: 'inherit',
        fontSize: '12px',
        maxWidth: '100%',
      },
      color: {
        type: 'ordinal',
        legend: true,
      },
      x: {
        label: 'Biweekly season bucket',
        grid: false,
        tickFormat: formatBucketTick,
      },
      y: {
        label: `${metricDefinition.label} (${metricDefinition.unit})`,
        grid: true,
        nice: true,
      },
      marks: [
        Plot.line(lineSegmentPoints, {
          x: 'bucketIndex',
          y: 'value',
          z: 'segmentId',
          stroke: (point: SeasonalLineSegmentPoint) => String(point.year),
          strokeWidth: 2,
          strokeOpacity: 0.82,
        }),
        Plot.dot(buckets, {
          x: 'bucketIndex',
          y: 'value',
          r: (bucket: SeasonalMetricBucket) => (bucket.sparse ? 3.5 : 4.6),
          fill: (bucket: SeasonalMetricBucket) => String(bucket.year),
          fillOpacity: (bucket: SeasonalMetricBucket) => (bucket.sparse ? 0.56 : 0.86),
          stroke: '#ffffff',
          strokeWidth: 1.4,
          title: (bucket: SeasonalMetricBucket) =>
            formatBucketTitle(bucket, metricDefinition),
          ariaLabel: (bucket: SeasonalMetricBucket) =>
            `${bucket.year}, ${formatWeekRange(
              bucket,
            )}, ${metricDefinition.label.toLowerCase()} ${formatMetricValue(
              bucket.value,
              metricDefinition,
            )}, ${bucket.sampleCount} ${formatActivityCount(bucket.sampleCount)}`,
        }),
        Plot.tip(
          buckets,
          Plot.pointer({
            x: 'bucketIndex',
            y: 'value',
            title: (bucket: SeasonalMetricBucket) =>
              formatBucketTitle(bucket, metricDefinition),
          }),
        ),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [buckets, chartWidth, lineSegmentPoints, metricDefinition])

  return (
    <figure className="trend-chart seasonal-chart" aria-label={chartLabel}>
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Seasonal</span>
          <strong>{chartLabel}</strong>
          <p className="relationship-status">Biweekly median by year</p>
        </div>
      </figcaption>

      <div className="chart-card-controls">
        <div className="chart-view-controls">{viewControls}</div>
        <div className="chart-metric-controls">{metricControls}</div>
      </div>

      <div className="chart-card-selection-summary">
        <SelectionStatus activities={activities} totalActivityCount={totalActivityCount} />
      </div>

      <div ref={containerRef} className="trend-chart-container seasonal-chart-container">
        {hasNoSelectedActivities && (
          <div className="chart-empty-state">
            No activities to plot for the current selection.
          </div>
        )}
        {hasNoValidMetricValues && (
          <div className="chart-empty-state">
            No activities have valid {metricDefinition.label.toLowerCase()} values
            for the current selection.
          </div>
        )}
      </div>
    </figure>
  )
}

function formatBucketTick(bucketIndex: number): string {
  const startWeek = (bucketIndex - 1) * 2 + 1
  const endWeek = Math.min(startWeek + 1, 53)

  return startWeek === endWeek ? `W${startWeek}` : `W${startWeek}-${endWeek}`
}

function formatBucketTitle(
  bucket: SeasonalMetricBucket,
  metricDefinition: MetricDefinition,
): string {
  const lines = [
    `Year: ${bucket.year}`,
    `${formatWeekRange(bucket)}`,
    `${metricDefinition.label} median: ${formatMetricValue(
      bucket.value,
      metricDefinition,
    )}`,
    `Sample count: ${bucket.sampleCount} ${formatActivityCount(bucket.sampleCount)}`,
  ]

  if (bucket.sparse) {
    lines.push('Sparse bucket')
  }

  return lines.join('\n')
}

function formatWeekRange(bucket: SeasonalMetricBucket): string {
  if (bucket.startWeek === bucket.endWeek) {
    return `Week: ${bucket.startWeek}`
  }

  return `Weeks: ${bucket.startWeek}-${bucket.endWeek}`
}

function formatActivityCount(sampleCount: number): string {
  return sampleCount === 1 ? 'activity' : 'activities'
}
