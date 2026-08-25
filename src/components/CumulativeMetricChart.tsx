import * as Plot from '@observablehq/plot'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { CumulativeMetricPoint } from '../analysis/cumulativeMetrics.ts'
import {
  getMetricDefinition,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import {
  addActivityContextLines,
  formatMetricValue,
} from './chartTooltipText.ts'

type CumulativeMetricChartProps = {
  activities: Activity[]
  totalActivityCount: number
  yMetric: MetricKey
  points: CumulativeMetricPoint[]
  viewControls?: ReactNode
  metricControls?: ReactNode
}

const fallbackChartWidth = 720
const chartHeight = 320

export function CumulativeMetricChart({
  activities,
  totalActivityCount,
  yMetric,
  points,
  viewControls,
  metricControls,
}: CumulativeMetricChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const metricDefinition = getMetricDefinition(yMetric)
  const chartLabel = `Cumulative ${metricDefinition.label}`
  const hasNoSelectedActivities = activities.length === 0
  const hasNoValidMetricValues = activities.length > 0 && points.length === 0

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

    if (!container || points.length === 0) {
      return
    }

    const plot = Plot.plot({
      width: Math.max(320, chartWidth),
      height: chartHeight,
      marginTop: 24,
      marginRight: 24,
      marginBottom: 48,
      marginLeft: 64,
      style: {
        background: 'transparent',
        color: '#172026',
        fontFamily: 'inherit',
        fontSize: '12px',
        maxWidth: '100%',
      },
      x: {
        label: 'Activity date',
        grid: false,
      },
      y: {
        label: `Cumulative ${metricDefinition.label} (${metricDefinition.unit})`,
        grid: true,
        nice: true,
      },
      marks: [
        Plot.line(points, {
          x: 'date',
          y: 'cumulativeValue',
          stroke: '#2f6f56',
          strokeWidth: 2,
          strokeOpacity: 0.84,
        }),
        Plot.dot(points, {
          x: 'date',
          y: 'cumulativeValue',
          r: 4,
          fill: '#2f6f56',
          fillOpacity: 0.86,
          stroke: '#ffffff',
          strokeWidth: 1.4,
          title: (point: CumulativeMetricPoint) =>
            formatPointTitle(point, yMetric, metricDefinition),
          ariaLabel: (point: CumulativeMetricPoint) =>
            `${point.localDate}, ${metricDefinition.label.toLowerCase()} ${formatMetricValue(
              point.value,
              metricDefinition,
            )}, cumulative ${metricDefinition.label.toLowerCase()} ${formatMetricValue(
              point.cumulativeValue,
              metricDefinition,
            )}`,
        }),
        Plot.tip(
          points,
          Plot.pointer({
            x: 'date',
            y: 'cumulativeValue',
            title: (point: CumulativeMetricPoint) =>
              formatPointTitle(point, yMetric, metricDefinition),
          }),
        ),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [chartWidth, metricDefinition, points, yMetric])

  return (
    <figure className="trend-chart cumulative-chart" aria-label={chartLabel}>
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Cumulative</span>
          <strong>{chartLabel}</strong>
          <p className="relationship-status">Continuous accumulation</p>
        </div>
      </figcaption>

      <div className="chart-card-controls">
        <div className="chart-view-controls">{viewControls}</div>
        <div className="chart-metric-controls">{metricControls}</div>
      </div>

      <div className="chart-card-selection-summary">
        <SelectionStatus activities={activities} totalActivityCount={totalActivityCount} />
      </div>

      <div ref={containerRef} className="trend-chart-container cumulative-chart-container">
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

function formatPointTitle(
  point: CumulativeMetricPoint,
  yMetric: MetricKey,
  metricDefinition: MetricDefinition,
): string {
  const { activity } = point
  const lines = [
    `Date: ${point.localDate}`,
    `Activity type: ${activity.sportType}`,
    `Activity ${metricDefinition.label}: ${formatMetricValue(point.value, metricDefinition)}`,
    `Cumulative ${metricDefinition.label}: ${formatMetricValue(
      point.cumulativeValue,
      metricDefinition,
    )}`,
  ]

  addActivityContextLines(lines, activity, [yMetric])

  return lines.join('\n')
}
