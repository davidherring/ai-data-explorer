import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Dispatch, SetStateAction } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import {
  defaultCumulativeView,
  defaultRelationshipView,
  defaultSeasonalView,
  defaultTrendView,
  type AnalysisState,
} from '../state/analysisState.ts'

describe('AnalysisWorkspaceShell', () => {
  afterEach(() => {
    cleanup()
  })

  it('switches to the default relationship view while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
      grouping: 'year',
      aggregation: 'raw',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: defaultRelationshipView,
    })
  })

  it('updates the trend metric while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'trend',
        yMetric: 'averageSpeedMph',
      },
      grouping: 'year',
      aggregation: 'raw',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.change(screen.getByLabelText('Trend metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
    })
  })

  it('renders the active trend metric from analysis state', () => {
    renderWorkspace({
      selection: {
        dayMode: 'all',
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
      aggregation: 'raw',
    })

    expect(screen.getByLabelText('Distance over calendar time')).toBeInTheDocument()
    expect(screen.queryByLabelText('Average speed over calendar time')).not.toBeInTheDocument()
  })

  it('switches to the default trend view while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'elevationGainFeet',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: defaultTrendView,
    })
  })

  it('switches to the default seasonal view while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.click(screen.getByRole('button', { name: 'Seasonal' }))

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: defaultSeasonalView,
    })
  })

  it('switches to the default cumulative view while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'elevationGainFeet',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.click(screen.getByRole('button', { name: 'Cumulative' }))

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: defaultCumulativeView,
    })
  })

  it('updates relationship metrics while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'relationship',
        xMetric: 'elevationGainFeet',
        yMetric: 'averageSpeedMph',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.change(screen.getByLabelText('Relationship X metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'averageSpeedMph',
      },
    })

    fireEvent.change(screen.getByLabelText('Relationship Y metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(applyStateUpdateAt(initialState, onAnalysisStateChange, 1)).toEqual({
      ...initialState,
      view: {
        type: 'relationship',
        xMetric: 'elevationGainFeet',
        yMetric: 'distanceMiles',
      },
    })
  })

  it('updates seasonal metrics while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'seasonal',
        yMetric: 'averageSpeedMph',
        aggregation: 'biweekly-median',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.change(screen.getByLabelText('Seasonal metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: {
        type: 'seasonal',
        yMetric: 'distanceMiles',
        aggregation: 'biweekly-median',
      },
    })
  })

  it('updates cumulative metrics while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        years: [2025],
        dayMode: 'weekday',
      },
      comparison: {
        years: [2024],
        dayMode: 'all',
      },
      view: {
        type: 'cumulative',
        yMetric: 'distanceMiles',
        accumulation: 'continuous',
      },
      grouping: 'month',
      aggregation: 'weekly',
    }
    const onAnalysisStateChange = vi.fn()

    renderWorkspace(initialState, onAnalysisStateChange)
    fireEvent.change(screen.getByLabelText('Cumulative metric'), {
      target: { value: 'elevationGainFeet' },
    })

    expect(applyStateUpdate(initialState, onAnalysisStateChange)).toEqual({
      ...initialState,
      view: {
        type: 'cumulative',
        yMetric: 'elevationGainFeet',
        accumulation: 'continuous',
      },
    })
  })

  it('renders non-default relationship metrics from analysis state', () => {
    renderWorkspace({
      selection: {
        dayMode: 'all',
      },
      view: {
        type: 'relationship',
        xMetric: 'movingTimeMinutes',
        yMetric: 'distanceMiles',
      },
      aggregation: 'raw',
    })

    expect(screen.getByLabelText('Moving time vs Distance')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Elevation gain vs Average speed'),
    ).not.toBeInTheDocument()
  })

  it.each(['seasonal', 'cumulative'] as const)(
    'does not silently render Trend for an unsupported %s view',
    (viewType) => {
      renderWorkspace({
        selection: {
          dayMode: 'all',
        },
        view: viewType === 'seasonal' ? defaultSeasonalView : defaultCumulativeView,
        aggregation: 'raw',
      })

      expect(screen.getByText('This view is not implemented yet.')).toBeInTheDocument()
      expect(
        screen.queryByLabelText('Average speed over calendar time'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText('Elevation gain vs Average speed'),
      ).not.toBeInTheDocument()
    },
  )
})

function renderWorkspace(
  analysisState: AnalysisState,
  onAnalysisStateChange: Dispatch<SetStateAction<AnalysisState>> = vi.fn(),
) {
  return render(
    <AnalysisWorkspaceShell
      rides={[ride]}
      selectedRides={[ride]}
      analysisState={analysisState}
      onAnalysisStateChange={onAnalysisStateChange}
    />,
  )
}

function applyStateUpdate(
  initialState: AnalysisState,
  onAnalysisStateChange: ReturnType<typeof vi.fn>,
): AnalysisState {
  return applyStateUpdateAt(initialState, onAnalysisStateChange, 0)
}

function applyStateUpdateAt(
  initialState: AnalysisState,
  onAnalysisStateChange: ReturnType<typeof vi.fn>,
  callIndex: number,
): AnalysisState {
  const [update] = onAnalysisStateChange.mock.calls[callIndex]

  return typeof update === 'function' ? update(initialState) : update
}

const ride: Ride = {
  id: 'ride-a',
  startTime: '2025-01-01T07:00:00-07:00',
  localDate: '2025-01-01',
  year: 2025,
  month: 1,
  weekOfYear: 1,
  dayOfWeek: 'wednesday' satisfies DayOfWeek,
  isWeekend: false,
  distanceMiles: 20,
  movingTimeMinutes: 60,
  elapsedTimeMinutes: 65,
  averageSpeedMph: 15,
  elevationGainFeet: 500,
  sportType: 'Ride',
  trainer: false,
  commute: false,
  manual: false,
}
