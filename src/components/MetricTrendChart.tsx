import * as Plot from '@observablehq/plot'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getMetricDefinition,
  getRideMetric,
  type MetricDefinition,
} from '../analysis/rideMetrics.ts'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'

type MetricTrendChartProps = {
  rides: Ride[]
  totalRideCount: number
  yMetric: MetricKey
  headerControls?: ReactNode
}

type TrendPoint = {
  date: Date
  ride: Ride
  value: number
}

const fallbackChartWidth = 720
const chartHeight = 320

export function MetricTrendChart({
  rides,
  totalRideCount,
  yMetric,
  headerControls,
}: MetricTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const metricDefinition = getMetricDefinition(yMetric)
  const chartLabel = `${metricDefinition.label} over calendar time`
  const points = useMemo(
    () => {
      const nextPoints: TrendPoint[] = []

      for (const ride of rides) {
        const value = getRideMetric(ride, yMetric)

        if (value === undefined || !Number.isFinite(value)) {
          continue
        }

        nextPoints.push({
          date: parseLocalCalendarDate(ride.localDate),
          ride,
          value,
        })
      }

      return nextPoints
    },
    [rides, yMetric],
  )
  const hasNoSelectedRides = rides.length === 0
  const hasNoValidMetricValues = rides.length > 0 && points.length === 0

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
      marginLeft: 56,
      style: {
        background: 'transparent',
        color: '#172026',
        fontFamily: 'inherit',
        fontSize: '12px',
        maxWidth: '100%',
      },
      x: {
        label: 'Ride date',
        grid: false,
      },
      y: {
        label: `${metricDefinition.label} (${metricDefinition.unit})`,
        grid: true,
        nice: true,
      },
      marks: [
        Plot.dot(points, {
          x: 'date',
          y: 'value',
          r: 4,
          fill: '#2f6f56',
          fillOpacity: 0.8,
          stroke: '#ffffff',
          strokeWidth: 1.4,
          title: (point: TrendPoint) =>
            formatRideTitle(point, yMetric, metricDefinition),
          ariaLabel: (point: TrendPoint) =>
            `${point.ride.localDate}, ${metricDefinition.label.toLowerCase()} ${formatMetricValue(
              point.value,
              metricDefinition,
            )}`,
        }),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [chartWidth, metricDefinition, points, yMetric])

  return (
    <figure className="trend-chart" aria-label={chartLabel}>
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Trend</span>
          <strong>{chartLabel}</strong>
        </div>
        {headerControls}
        <SelectionStatus rides={rides} totalRideCount={totalRideCount} />
      </figcaption>

      <div ref={containerRef} className="trend-chart-container">
        {hasNoSelectedRides && (
          <div className="chart-empty-state">
            No rides to plot for the current selection.
          </div>
        )}
        {hasNoValidMetricValues && (
          <div className="chart-empty-state">
            No rides have valid {metricDefinition.label.toLowerCase()} values
            for the current selection.
          </div>
        )}
      </div>
    </figure>
  )
}

function parseLocalCalendarDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function formatRideTitle(
  point: TrendPoint,
  yMetric: MetricKey,
  metricDefinition: MetricDefinition,
): string {
  const { ride } = point
  const lines = [
    ride.localDate,
    `${metricDefinition.label}: ${formatMetricValue(point.value, metricDefinition)}`,
  ]

  if (yMetric !== 'distanceMiles') {
    const distanceDefinition = getMetricDefinition('distanceMiles')
    lines.push(
      `${distanceDefinition.label}: ${formatMetricValue(
        ride.distanceMiles,
        distanceDefinition,
      )}`,
    )
  }

  if (yMetric !== 'elevationGainFeet') {
    const elevationDefinition = getMetricDefinition('elevationGainFeet')
    lines.push(
      `${elevationDefinition.label}: ${formatMetricValue(
        ride.elevationGainFeet,
        elevationDefinition,
      )}`,
    )
  }

  lines.push(`Sport type: ${ride.sportType}`)

  return lines.join('\n')
}

function formatMetricValue(
  value: number,
  metricDefinition: MetricDefinition,
): string {
  return `${metricDefinition.format(value)} ${metricDefinition.unit}`
}
