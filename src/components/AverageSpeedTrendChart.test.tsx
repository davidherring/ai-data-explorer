import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AverageSpeedTrendChart } from './AverageSpeedTrendChart.tsx'
import type { DayOfWeek, Ride } from '../data/ride.ts'

describe('AverageSpeedTrendChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty chart state for empty rides', () => {
    render(<AverageSpeedTrendChart rides={[]} totalRideCount={2} />)

    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No rides to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders the labeled chart region for non-empty rides', async () => {
    render(<AverageSpeedTrendChart rides={[rideA, rideB]} totalRideCount={2} />)

    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Average speed over calendar time'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('mounts Plot output', async () => {
    render(<AverageSpeedTrendChart rides={[rideA]} totalRideCount={1} />)

    await waitFor(() => {
      expect(document.querySelector('.trend-chart-container svg')).toBeInTheDocument()
    })
  })

  it('preserves localDate and ride details in native tooltip text', async () => {
    render(<AverageSpeedTrendChart rides={[rideA]} totalRideCount={1} />)

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('2025-03-12')
    expect(document.body.textContent).toContain('Average speed: 15.2 mph')
    expect(document.body.textContent).toContain('Distance: 31.4 mi')
    expect(document.body.textContent).toContain('Elevation: 1,250 ft')
    expect(document.body.textContent).toContain('Sport type: Ride')
  })

  it('replaces Plot output when rides change', async () => {
    const { rerender } = render(
      <AverageSpeedTrendChart rides={[rideA]} totalRideCount={1} />,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('2025-03-12')
    })

    rerender(<AverageSpeedTrendChart rides={[rideB]} totalRideCount={1} />)

    await waitFor(() => {
      expect(document.body.textContent).toContain('2026-07-04')
    })

    expect(document.body.textContent).not.toContain('2025-03-12')
    expect(document.querySelectorAll('.trend-chart-container svg')).toHaveLength(1)
  })
})

const rideA = createRide({
  id: 'ride-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  sportType: 'Ride',
})

const rideB = createRide({
  id: 'ride-b',
  localDate: '2026-07-04',
  averageSpeedMph: 16.01,
  distanceMiles: 42,
  elevationGainFeet: 2400,
  sportType: 'GravelRide',
})

function createRide(overrides: {
  id: string
  localDate: string
  averageSpeedMph: number
  distanceMiles: number
  elevationGainFeet: number
  sportType: string
}): Ride {
  return {
    id: overrides.id,
    startTime: `${overrides.localDate}T07:00:00-07:00`,
    localDate: overrides.localDate,
    year: Number(overrides.localDate.slice(0, 4)),
    month: Number(overrides.localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles,
    movingTimeMinutes: 60,
    elapsedTimeMinutes: 65,
    averageSpeedMph: overrides.averageSpeedMph,
    elevationGainFeet: overrides.elevationGainFeet,
    sportType: overrides.sportType,
    trainer: false,
    commute: false,
    manual: false,
  }
}
