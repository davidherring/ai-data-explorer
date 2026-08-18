import * as Plot from '@observablehq/plot'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type {
  MetricRelationshipPoint,
  MetricRelationshipResult,
} from '../analysis/metricRelationships.ts'
import { RelationshipStatus } from './RelationshipStatus.tsx'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Ride } from '../data/ride.ts'

type RelationshipScatterChartProps = {
  rides: Ride[]
  totalRideCount: number
  relationship: MetricRelationshipResult
  points: MetricRelationshipPoint[]
  headerControls?: ReactNode
}

const fallbackChartWidth = 720
const chartHeight = 320
const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})
const elevationFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function RelationshipScatterChart({
  rides,
  totalRideCount,
  relationship,
  points,
  headerControls,
}: RelationshipScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
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
        label: 'Elevation gain (ft)',
        grid: true,
        nice: true,
      },
      y: {
        label: 'Average speed (mph)',
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
          title: ({ ride }: MetricRelationshipPoint) => formatRideTitle(ride),
          ariaLabel: ({ ride }: MetricRelationshipPoint) =>
            `${ride.localDate}, elevation ${formatElevation(
              ride.elevationGainFeet,
            )} ft, average speed ${formatDecimal(ride.averageSpeedMph)} mph`,
        }),
      ],
    })

    container.append(plot)

    return () => {
      plot.remove()
    }
  }, [chartWidth, points])

  return (
    <figure
      className="trend-chart relationship-chart"
      aria-label="Elevation gain vs average speed"
    >
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Relationship</span>
          <strong>Elevation gain vs average speed</strong>
          <RelationshipStatus relationship={relationship} />
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
            No rides have valid elevation and speed values.
          </div>
        )}
      </div>
    </figure>
  )
}

function formatRideTitle(ride: Ride): string {
  return [
    ride.localDate,
    `Average speed: ${formatDecimal(ride.averageSpeedMph)} mph`,
    `Distance: ${formatDecimal(ride.distanceMiles)} mi`,
    `Elevation: ${formatElevation(ride.elevationGainFeet)} ft`,
    `Sport type: ${ride.sportType}`,
  ].join('\n')
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

function formatElevation(value: number): string {
  return elevationFormatter.format(Math.round(value))
}
