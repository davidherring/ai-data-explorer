import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SelectionStatus } from './SelectionStatus.tsx'
import type { DayOfWeek, Activity } from '../data/activity.ts'

describe('SelectionStatus', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an empty state without averages', () => {
    render(<SelectionStatus activities={[]} totalActivityCount={12} />)

    expect(screen.getByText('0 of 12 activities selected')).toBeInTheDocument()
    expect(
      screen.getByText('No activities match the current filters.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Selection averages')).not.toBeInTheDocument()
  })

  it('renders a sparse state for one selected activity with singular wording', () => {
    render(<SelectionStatus activities={[rideA]} totalActivityCount={1} />)

    expect(screen.getByText('1 of 1 activity selected')).toBeInTheDocument()
    expect(
      screen.getByText('Too few activities for a meaningful trend.'),
    ).toBeInTheDocument()
  })

  it('renders a sparse state for two selected activities', () => {
    render(<SelectionStatus activities={[rideA, rideB]} totalActivityCount={4} />)

    expect(screen.getByText('2 of 4 activities selected')).toBeInTheDocument()
    expect(
      screen.getByText('Too few activities for a meaningful trend.'),
    ).toBeInTheDocument()
  })

  it('renders a normal state for three or more selected activities', () => {
    render(<SelectionStatus activities={[rideA, rideB, rideC]} totalActivityCount={5} />)

    expect(screen.getByText('3 of 5 activities selected')).toBeInTheDocument()
    expect(screen.getByText('Selection ready.')).toBeInTheDocument()
  })

  it('formats average speed with one decimal and mph', () => {
    render(<SelectionStatus activities={[rideA, rideB, rideC]} totalActivityCount={3} />)

    expect(screen.getByText('15.2 mph')).toBeInTheDocument()
  })

  it('formats average distance with one decimal and mi', () => {
    render(<SelectionStatus activities={[rideA, rideB, rideC]} totalActivityCount={3} />)

    expect(screen.getByText('21.8 mi')).toBeInTheDocument()
  })

  it('formats average elevation as whole feet with separators', () => {
    render(<SelectionStatus activities={[rideA, rideB, rideC]} totalActivityCount={3} />)

    expect(screen.getByText('1,301 ft')).toBeInTheDocument()
  })
})

const rideA = createActivity({
  id: 'activity-a',
  averageSpeedMph: 14.84,
  distanceMiles: 10.25,
  elevationGainFeet: 500,
})

const rideB = createActivity({
  id: 'activity-b',
  averageSpeedMph: 15.16,
  distanceMiles: 20.75,
  elevationGainFeet: 1000,
})

const rideC = createActivity({
  id: 'activity-c',
  averageSpeedMph: 15.48,
  distanceMiles: 34.25,
  elevationGainFeet: 2404,
})

function createActivity(overrides: {
  id: string
  averageSpeedMph: number
  distanceMiles: number
  elevationGainFeet: number
}): Activity {
  return {
    id: overrides.id,
    startTime: '2025-01-01T07:00:00-07:00',
    localDate: '2025-01-01',
    year: 2025,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles,
    movingTimeMinutes: 60,
    elapsedTimeMinutes: 65,
    averageSpeedMph: overrides.averageSpeedMph,
    elevationGainFeet: overrides.elevationGainFeet,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
