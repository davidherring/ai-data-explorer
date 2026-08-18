import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Dispatch, SetStateAction } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import {
  defaultRelationshipView,
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

  it.each(['seasonal', 'cumulative'] as const)(
    'does not silently render Trend for an unsupported %s view',
    (viewType) => {
      renderWorkspace({
        selection: {
          dayMode: 'all',
        },
        view: {
          type: viewType,
        },
        aggregation: 'raw',
      })

      expect(screen.getByText('This view is not implemented yet.')).toBeInTheDocument()
      expect(
        screen.queryByLabelText('Average speed over calendar time'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText('Elevation gain vs average speed'),
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
  const [update] = onAnalysisStateChange.mock.calls[0]

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
