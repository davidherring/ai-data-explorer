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
} from '../analysis/rideMetrics.ts'
import { RelationshipStatus } from './RelationshipStatus.tsx'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'

type RelationshipScatterChartProps = {
  rides: Ride[]
  totalRideCount: number
  xMetric: MetricKey
  yMetric: MetricKey
  relationship: MetricRelationshipResult
  points: MetricRelationshipPoint[]
  headerControls?: ReactNode
}

const fallbackChartWidth = 720
const chartHeight = 320

export function RelationshipScatterChart({
  rides,
  totalRideCount,
  xMetric,
  yMetric,
  relationship,
  points,
  headerControls,
}: RelationshipScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const xDefinition = getMetricDefinition(xMetric)
  const yDefinition = getMetricDefinition(yMetric)
  const chartLabel = `${xDefinition.label} vs ${yDefinition.label}`
  const hasNoSelectedRides = rides.length === 0
  const hasNoValidPairs = rides.length > 0 && points.length === 0

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
      marks: [
        Plot.dot(points, {
          x: 'x',
          y: 'y',
          r: 4,
          fill: '#315f8a',
          fillOpacity: 0.82,
          stroke: '#ffffff',
          strokeWidth: 1.4,
          title: (point: MetricRelationshipPoint) =>
            formatRideTitle(point, xMetric, yMetric, xDefinition, yDefinition),
          ariaLabel: (point: MetricRelationshipPoint) =>
            formatPointAriaLabel(
              point,
              xMetric,
              yMetric,
              xDefinition,
              yDefinition,
            ),
        }),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [chartWidth, points, xDefinition, xMetric, yDefinition, yMetric])

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
        {headerControls}
        <SelectionStatus rides={rides} totalRideCount={totalRideCount} />
      </figcaption>

      <div ref={containerRef} className="trend-chart-container relationship-chart-container">
        {hasNoSelectedRides && (
          <div className="chart-empty-state">
            No rides to plot for the current selection.
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

function formatRideTitle(
  point: MetricRelationshipPoint,
  xMetric: MetricKey,
  yMetric: MetricKey,
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
): string {
  const { ride } = point
  const lines = [
    ride.localDate,
    `${xDefinition.label}: ${formatMetricValue(point.x, xDefinition)}`,
  ]

  if (xMetric !== yMetric) {
    lines.push(`${yDefinition.label}: ${formatMetricValue(point.y, yDefinition)}`)
  }

  addContextLines(lines, ride, xMetric, yMetric)

  lines.push(`Sport type: ${ride.sportType}`)

  return lines.join('\n')
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

  return `${point.ride.localDate}, ${metricParts.join(', ')}`
}

function addContextLines(
  lines: string[],
  ride: Ride,
  xMetric: MetricKey,
  yMetric: MetricKey,
): void {
  if (xMetric !== 'distanceMiles' && yMetric !== 'distanceMiles') {
    const distanceDefinition = getMetricDefinition('distanceMiles')
    lines.push(
      `${distanceDefinition.label}: ${formatMetricValue(
        ride.distanceMiles,
        distanceDefinition,
      )}`,
    )
  }

  if (xMetric !== 'elevationGainFeet' && yMetric !== 'elevationGainFeet') {
    const elevationDefinition = getMetricDefinition('elevationGainFeet')
    lines.push(
      `${elevationDefinition.label}: ${formatMetricValue(
        ride.elevationGainFeet,
        elevationDefinition,
      )}`,
    )
  }
}

function formatNoValidPairsMessage(
  xMetric: MetricKey,
  yMetric: MetricKey,
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
): string {
  if (xMetric === yMetric) {
    return `No rides have valid ${xDefinition.label.toLowerCase()} values for the current selection.`
  }

  return `No rides have valid ${xDefinition.label.toLowerCase()} and ${yDefinition.label.toLowerCase()} values for the current selection.`
}

function formatMetricValue(
  value: number,
  metricDefinition: MetricDefinition,
): string {
  return `${metricDefinition.format(value)} ${metricDefinition.unit}`
}
