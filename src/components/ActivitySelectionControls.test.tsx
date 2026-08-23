import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ActivitySelectionControls } from './ActivitySelectionControls.tsx'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  defaultAnalysisState,
  defaultRecurringDateRange,
  type ActivitySelection,
} from '../state/analysisState.ts'

const activities: Activity[] = [
  createActivity({
    id: 'activity-2024',
    localDate: '2024-01-01',
    year: 2024,
    dayOfWeek: 'monday',
    isWeekend: false,
    sportType: 'Ride',
  }),
  createActivity({
    id: 'activity-2025',
    localDate: '2025-01-01',
    year: 2025,
    dayOfWeek: 'wednesday',
    isWeekend: false,
    sportType: 'GravelRide',
  }),
  createActivity({
    id: 'activity-2025-virtual',
    localDate: '2025-02-01',
    year: 2025,
    dayOfWeek: 'saturday',
    isWeekend: true,
    sportType: 'VirtualRide',
  }),
]

describe('ActivitySelectionControls', () => {
  afterEach(() => {
    cleanup()
  })

  it('derives sorted year options from activities', () => {
    renderControls()

    const yearCheckboxes = screen.getAllByRole('checkbox', {
      name: /^20\d{2}$/,
    })

    expect(yearCheckboxes.map((checkbox) => checkbox.closest('label')?.textContent)).toEqual([
      '2025',
      '2024',
    ])
  })

  it('stores multiple selected years as a sorted years array', () => {
    renderControls()

    fireEvent.click(screen.getByLabelText('2025'))
    fireEvent.click(screen.getByLabelText('2024'))

    expect(readSelection()).toMatchObject({ years: [2024, 2025] })
  })

  it('removes years when the final selected year is unchecked', () => {
    renderControls({ ...defaultAnalysisState.selection, years: [2025] })

    fireEvent.click(screen.getByLabelText('2025'))

    expect(readSelection().years).toEqual([])
  })

  it('updates date range bounds and removes blank bounds', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '2025-01-01' },
    })
    fireEvent.change(screen.getByLabelText('End'), {
      target: { value: '2025-12-31' },
    })

    expect(readSelection().dateRange).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    })

    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '' },
    })
    expect(readSelection().dateRange).toEqual({ end: '2025-12-31' })

    fireEvent.change(screen.getByLabelText('End'), {
      target: { value: '' },
    })
    expect(readSelection().dateRange).toBeUndefined()
  })

  it('sets and resets a valid recurring seasonal window', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Season start'), {
      target: { value: '03-15' },
    })
    expect(readSelection().recurringDateRange).toEqual({
      type: 'recurring-month-day',
      start: { month: 3, day: 15 },
      end: { month: 12, day: 31 },
    })

    fireEvent.change(screen.getByLabelText('Season end'), {
      target: { value: '06-20' },
    })

    expect(readSelection().recurringDateRange).toEqual({
      type: 'recurring-month-day',
      start: { month: 3, day: 15 },
      end: { month: 6, day: 20 },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset seasonal window' }))

    expect(readSelection().recurringDateRange).toEqual(defaultRecurringDateRange)
  })

  it('does not commit incomplete or structurally invalid seasonal window input', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Season start'), {
      target: { value: '06-20' },
    })
    const latestValidRange = {
      type: 'recurring-month-day' as const,
      start: { month: 6, day: 20 },
      end: { month: 12, day: 31 },
    }

    fireEvent.change(screen.getByLabelText('Season end'), {
      target: { value: '03-15' },
    })

    expect(readSelection().recurringDateRange).toEqual(latestValidRange)

    fireEvent.change(screen.getByLabelText('Season start'), {
      target: { value: '02-30' },
    })
    fireEvent.change(screen.getByLabelText('Season end'), {
      target: { value: '03-15' },
    })

    expect(readSelection().recurringDateRange).toEqual(latestValidRange)
  })

  it('allows Feb 29 as seasonal window input', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Season start'), {
      target: { value: '02-29' },
    })
    fireEvent.change(screen.getByLabelText('Season end'), {
      target: { value: '02-29' },
    })

    expect(readSelection().recurringDateRange).toEqual({
      type: 'recurring-month-day',
      start: { month: 2, day: 29 },
      end: { month: 2, day: 29 },
    })
  })

  it('toggles days of week and keeps an explicit empty array', () => {
    renderControls({ ...defaultAnalysisState.selection, daysOfWeek: [] })

    fireEvent.click(screen.getByLabelText('Wed'))
    fireEvent.click(screen.getByLabelText('Sun'))

    expect(readSelection().daysOfWeek).toEqual(['wednesday', 'sunday'])

    fireEvent.click(screen.getByLabelText('Wed'))
    fireEvent.click(screen.getByLabelText('Sun'))

    expect(readSelection().daysOfWeek).toEqual([])
  })

  it('updates distance bounds and removes blank bounds', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Min mi'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Max mi'), {
      target: { value: '40' },
    })

    expect(readSelection().distanceMiles).toEqual({ min: 10, max: 40 })

    fireEvent.change(screen.getByLabelText('Min mi'), {
      target: { value: '' },
    })
    expect(readSelection().distanceMiles).toEqual({ max: 40 })

    fireEvent.change(screen.getByLabelText('Max mi'), {
      target: { value: '' },
    })
    expect(readSelection().distanceMiles).toBeUndefined()
  })

  it('does not write NaN for invalid numeric input', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Min mi'), {
      target: { value: 'not-a-number' },
    })

    expect(readSelection().distanceMiles).toBeUndefined()
  })

  it('updates elevation bounds and removes blank bounds', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Min ft'), {
      target: { value: '500' },
    })
    fireEvent.change(screen.getByLabelText('Max ft'), {
      target: { value: '1500' },
    })

    expect(readSelection().elevationGainFeet).toEqual({ min: 500, max: 1500 })

    fireEvent.change(screen.getByLabelText('Min ft'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Max ft'), {
      target: { value: '' },
    })

    expect(readSelection().elevationGainFeet).toBeUndefined()
  })

  it('updates sport type and clears it for all types', () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'VirtualRide' },
    })
    expect(readSelection()).toMatchObject({ sportType: 'VirtualRide' })

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: '' },
    })
    expect(readSelection().sportType).toBeUndefined()
  })

  it('resets to the default primary selection', () => {
    renderControls({
      years: [2025],
      daysOfWeek: ['saturday', 'sunday'],
      recurringDateRange: {
        type: 'recurring-month-day',
        start: { month: 3, day: 15 },
        end: { month: 6, day: 20 },
      },
      sportType: 'VirtualRide',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(readSelection()).toEqual(defaultAnalysisState.selection)
  })
})

function renderControls(initialSelection: ActivitySelection = defaultAnalysisState.selection) {
  render(<ControlledControls initialSelection={initialSelection} />)
}

function ControlledControls({
  initialSelection,
}: {
  initialSelection: ActivitySelection
}) {
  const [selection, setSelection] = useState<ActivitySelection>(initialSelection)

  return (
    <>
      <ActivitySelectionControls
        activities={activities}
        selection={selection}
        onSelectionChange={setSelection}
      />
      <output data-testid="selection-state">{JSON.stringify(selection)}</output>
    </>
  )
}

function readSelection(): ActivitySelection {
  return JSON.parse(screen.getByTestId('selection-state').textContent ?? '{}')
}

function createActivity(overrides: {
  id: string
  localDate: string
  year: number
  dayOfWeek: DayOfWeek
  isWeekend: boolean
  sportType: string
}): Activity {
  return {
    id: overrides.id,
    startTime: `${overrides.localDate}T07:00:00-07:00`,
    localDate: overrides.localDate,
    year: overrides.year,
    month: Number(overrides.localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: overrides.dayOfWeek,
    isWeekend: overrides.isWeekend,
    distanceMiles: 20,
    movingTimeMinutes: 60,
    averageSpeedMph: 15,
    elevationGainFeet: 500,
    sportType: overrides.sportType,
    trainer: false,
    commute: false,
    manual: false,
  }
}
