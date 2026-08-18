import * as Plot from '@observablehq/plot'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { Ride } from '../data/ride.ts'

type AverageSpeedTrendChartProps = {
  rides: Ride[]
  totalRideCount: number
}

type TrendPoint = {
  date: Date
  ride: Ride
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

export function AverageSpeedTrendChart({
  rides,
  totalRideCount,
}: AverageSpeedTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(fallbackChartWidth)
  const points = useMemo(
    () =>
      rides.map((ride) => ({
        date: parseLocalCalendarDate(ride.localDate),
        ride,
      })),
    [rides],
  )

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
        label: 'Average speed (mph)',
        grid: true,
        nice: true,
      },
      marks: [
        Plot.dot(points, {
          x: 'date',
          y: ({ ride }: TrendPoint) => ride.averageSpeedMph,
          r: 4,
          fill: '#2f6f56',
          fillOpacity: 0.8,
          stroke: '#ffffff',
          strokeWidth: 1.4,
          title: ({ ride }: TrendPoint) => formatRideTitle(ride),
          ariaLabel: ({ ride }: TrendPoint) =>
            `${ride.localDate}, average speed ${formatDecimal(
              ride.averageSpeedMph,
            )} mph`,
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
      className="trend-chart"
      aria-label="Average speed over calendar time"
    >
      <figcaption className="trend-chart-header">
        <div className="trend-chart-title">
          <span className="section-label">Trend</span>
          <strong>Average speed over calendar time</strong>
        </div>
        <SelectionStatus rides={rides} totalRideCount={totalRideCount} />
      </figcaption>

      <div ref={containerRef} className="trend-chart-container">
        {rides.length === 0 && (
          <div className="chart-empty-state">
            No rides to plot for the current selection.
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
