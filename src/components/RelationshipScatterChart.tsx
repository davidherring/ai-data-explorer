import * as Plot from '@observablehq/plot'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type {
  MetricRelationshipPoint,
  MetricRelationshipResult,
} from '../analysis/metricRelationships.ts'
import {
  getMetricDefinition,
  type MetricDefinition,
} from '../analysis/activityMetrics.ts'
import { RelationshipStatus } from './RelationshipStatus.tsx'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import {
  formatActivityYear,
  shouldEncodeActivityYear,
} from './activityYearEncoding.ts'
import {
  formatRelationshipPointTooltipTitle,
  formatMetricValue,
} from './chartTooltipText.ts'

type RelationshipScatterChartProps = {
  activities: Activity[]
  totalActivityCount: number
  xMetric: MetricKey
  yMetric: MetricKey
  relationship: MetricRelationshipResult
  points: MetricRelationshipPoint[]
  viewControls?: ReactNode
  metricControls?: ReactNode
}

const fallbackChartWidth = 720
const chartHeight = 320

export function RelationshipScatterChart({
  activities,
  totalActivityCount,
  xMetric,
  yMetric,
  relationship,
  points,
  viewControls,
  metricControls,
}: RelationshipScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const xDefinition = getMetricDefinition(xMetric)
  const yDefinition = getMetricDefinition(yMetric)
  const chartLabel = `${xDefinition.label} vs ${yDefinition.label}`
  const hasNoSelectedActivities = activities.length === 0
  const hasNoValidPairs = activities.length > 0 && points.length === 0
  const encodeYear = shouldEncodeActivityYear(points)

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
        label: `${xDefinition.label} (${xDefinition.unit})`,
        grid: true,
        nice: true,
      },
      y: {
        label: `${yDefinition.label} (${yDefinition.unit})`,
        grid: true,
        nice: true,
      },
      ...(encodeYear
        ? {
            color: {
              type: 'ordinal' as const,
              legend: true,
            },
          }
        : {}),
      marks: [
        Plot.dot(points, {
          x: 'x',
          y: 'y',
          r: 4,
          fill: encodeYear
            ? (point: MetricRelationshipPoint) =>
                formatActivityYear(point.activity.year)
            : '#315f8a',
          fillOpacity: 0.82,
          stroke: '#ffffff',
          strokeWidth: 1.4,
          ariaLabel: (point: MetricRelationshipPoint) =>
            formatPointAriaLabel(
              point,
              xMetric,
              yMetric,
              xDefinition,
              yDefinition,
            ),
        }),
        Plot.tip(
          points,
          Plot.pointer({
            x: 'x',
            y: 'y',
            title: (point: MetricRelationshipPoint) =>
              formatRelationshipPointTooltipTitle(
                point,
                xMetric,
                yMetric,
                xDefinition,
                yDefinition,
              ),
          }),
        ),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [chartWidth, encodeYear, points, xDefinition, xMetric, yDefinition, yMetric])

  return (
    <figure className="trend-chart relationship-chart" aria-label={chartLabel}>
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Relationship</span>
          <strong>{chartLabel}</strong>
          <RelationshipStatus
            relationship={relationship}
            xMetric={xMetric}
            yMetric={yMetric}
          />
        </div>
      </figcaption>

      <div className="chart-card-controls">
        <div className="chart-view-controls">{viewControls}</div>
        <div className="chart-metric-controls">{metricControls}</div>
      </div>

      <div className="chart-card-selection-summary">
        <SelectionStatus activities={activities} totalActivityCount={totalActivityCount} />
      </div>

      <div ref={containerRef} className="trend-chart-container relationship-chart-container">
        {hasNoSelectedActivities && (
          <div className="chart-empty-state">
            No activities to plot for the current selection.
          </div>
        )}
        {hasNoValidPairs && (
          <div className="chart-empty-state">
            {formatNoValidPairsMessage(xMetric, yMetric, xDefinition, yDefinition)}
          </div>
        )}
      </div>
    </figure>
  )
}

function formatPointAriaLabel(
  point: MetricRelationshipPoint,
  xMetric: MetricKey,
  yMetric: MetricKey,
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
): string {
  const metricParts = [
    `${xDefinition.label.toLowerCase()} ${formatMetricValue(point.x, xDefinition)}`,
  ]

  if (xMetric !== yMetric) {
    metricParts.push(
      `${yDefinition.label.toLowerCase()} ${formatMetricValue(
        point.y,
        yDefinition,
      )}`,
    )
  }

  return `${point.activity.localDate}, ${metricParts.join(', ')}`
}

function formatNoValidPairsMessage(
  xMetric: MetricKey,
  yMetric: MetricKey,
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
): string {
  if (xMetric === yMetric) {
    return `No activities have valid ${xDefinition.label.toLowerCase()} values for the current selection.`
  }

  return `No activities have valid ${xDefinition.label.toLowerCase()} and ${yDefinition.label.toLowerCase()} values for the current selection.`
}
