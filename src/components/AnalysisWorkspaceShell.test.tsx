import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Dispatch, SetStateAction } from 'react'
import { AnalysisWorkspaceShell } from './AnalysisWorkspaceShell.tsx'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  defaultCumulativeView,
  defaultAnalysisState,
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
      grouping: 'year',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'trend',
        yMetric: 'averageSpeedMph',
      },
      grouping: 'year',
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
      selection: defaultAnalysisState.selection,
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
    })

    expect(screen.getByLabelText('Distance over calendar time')).toBeInTheDocument()
    expect(screen.queryByLabelText('Average speed over calendar time')).not.toBeInTheDocument()
  })

  it('switches to the default trend view while preserving analysis state', () => {
    const initialState: AnalysisState = {
      selection: {
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'elevationGainFeet',
      },
      grouping: 'month',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
      grouping: 'month',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'relationship',
        xMetric: 'distanceMiles',
        yMetric: 'elevationGainFeet',
      },
      grouping: 'month',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'relationship',
        xMetric: 'elevationGainFeet',
        yMetric: 'averageSpeedMph',
      },
      grouping: 'month',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'seasonal',
        yMetric: 'averageSpeedMph',
        aggregation: 'biweekly-median',
      },
      grouping: 'month',
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
        ...defaultAnalysisState.selection,
        years: [2025],
      },
      comparison: {
        ...defaultAnalysisState.selection,
        years: [2024],
      },
      view: {
        type: 'cumulative',
        yMetric: 'distanceMiles',
        accumulation: 'continuous',
      },
      grouping: 'month',
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
      selection: defaultAnalysisState.selection,
      view: {
        type: 'relationship',
        xMetric: 'movingTimeMinutes',
        yMetric: 'distanceMiles',
      },
    })

    expect(screen.getByLabelText('Moving time vs Distance')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Elevation gain vs Average speed'),
    ).not.toBeInTheDocument()
  })

  it('renders chart controls and selection summary in stable chart-card regions', () => {
    const { container } = renderWorkspace({
      selection: defaultAnalysisState.selection,
      view: {
        type: 'relationship',
        xMetric: 'elevationGainFeet',
        yMetric: 'averageSpeedMph',
      },
    })

    const controls = container.querySelector('.chart-card-controls')
    const viewControls = container.querySelector('.chart-view-controls')
    const metricControls = container.querySelector('.chart-metric-controls')
    const summary = container.querySelector('.chart-card-selection-summary')

    expect(controls).toBeInTheDocument()
    expect(viewControls).toContainElement(
      screen.getByRole('group', { name: 'Visualization view' }),
    )
    expect(metricControls).toContainElement(
      screen.getByRole('group', { name: 'Chart metrics' }),
    )
    expect(summary).toContainElement(screen.getByLabelText('Selection status'))
    expect(metricControls).toContainElement(
      screen.getByLabelText('Relationship X metric'),
    )
    expect(metricControls).toContainElement(
      screen.getByLabelText('Relationship Y metric'),
    )
  })

  it('renders the default seasonal view from analysis state', () => {
    renderWorkspace({
      selection: defaultAnalysisState.selection,
      view: defaultSeasonalView,
    })

    expect(screen.getByLabelText('Average speed by season')).toBeInTheDocument()
    expect(screen.getByText('Biweekly median by year')).toBeInTheDocument()
    expect(screen.queryByText('This view is not implemented yet.')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Average speed over calendar time'),
    ).not.toBeInTheDocument()
  })

  it('renders the default cumulative view from analysis state', () => {
    renderWorkspace({
      selection: defaultAnalysisState.selection,
      view: defaultCumulativeView,
    })

    expect(screen.getByLabelText('Cumulative Distance')).toBeInTheDocument()
    expect(screen.getByText('Continuous accumulation')).toBeInTheDocument()
    expect(screen.queryByText('This view is not implemented yet.')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Elevation gain vs Average speed'),
    ).not.toBeInTheDocument()
  })

  it('renders non-default seasonal metrics from analysis state', () => {
    renderWorkspace({
      selection: defaultAnalysisState.selection,
      view: {
        type: 'seasonal',
        yMetric: 'distanceMiles',
        aggregation: 'biweekly-median',
      },
    })

    expect(screen.getByLabelText('Distance by season')).toBeInTheDocument()
    expect(screen.queryByLabelText('Average speed by season')).not.toBeInTheDocument()
  })

  it('renders non-default cumulative metrics from analysis state', () => {
    renderWorkspace({
      selection: defaultAnalysisState.selection,
      view: {
        type: 'cumulative',
        yMetric: 'elevationGainFeet',
        accumulation: 'continuous',
      },
    })

    expect(screen.getByLabelText('Cumulative Elevation gain')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cumulative Distance')).not.toBeInTheDocument()
  })

  it('passes empty selected activities through seasonal and cumulative charts', () => {
    renderWorkspace(
      {
        selection: defaultAnalysisState.selection,
        view: defaultSeasonalView,
      },
      vi.fn(),
      [],
    )

    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()

    cleanup()

    renderWorkspace(
      {
        selection: defaultAnalysisState.selection,
        view: defaultCumulativeView,
      },
      vi.fn(),
      [],
    )

    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()
  })
})

function renderWorkspace(
  analysisState: AnalysisState,
  onAnalysisStateChange: Dispatch<SetStateAction<AnalysisState>> = vi.fn(),
  selectedActivities: Activity[] = [activity],
) {
  return render(
    <AnalysisWorkspaceShell
      activities={[activity]}
      selectedActivities={selectedActivities}
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

const activity: Activity = {
  id: 'activity-a',
  startTime: '2025-01-01T07:00:00-07:00',
  localDate: '2025-01-01',
  year: 2025,
  month: 1,
  weekOfYear: 1,
  dayOfWeek: 'wednesday' satisfies DayOfWeek,
  isWeekend: false,
  distanceMiles: 20,
  movingTimeMinutes: 60,
  averageSpeedMph: 15,
  elevationGainFeet: 500,
  sportType: 'Ride',
  trainer: false,
  commute: false,
  manual: false,
}
