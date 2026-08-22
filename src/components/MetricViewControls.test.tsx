import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type {
  CumulativeViewConfiguration,
  RelationshipViewConfiguration,
  SeasonalViewConfiguration,
  TrendViewConfiguration,
} from '../state/analysisState.ts'
import { MetricViewControls } from './MetricViewControls.tsx'

describe('MetricViewControls', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders one trend metric selector with view-derived options', () => {
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={trendView}
        onViewChange={() => {}}
      />,
    )

    expect(screen.getByRole('group', { name: 'Chart metrics' })).toBeInTheDocument()
    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend metric')).toHaveValue('averageSpeedMph')
    expect(getOptionLabels('Trend metric')).toEqual([
      'Speed',
      'Distance',
      'Elevation',
      'Moving time',
    ])
  })

  it('renders relationship X and Y metric selectors', () => {
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={relationshipView}
        onViewChange={() => {}}
      />,
    )

    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
    expect(screen.getByLabelText('Relationship X metric')).toHaveValue(
      'elevationGainFeet',
    )
    expect(screen.getByLabelText('Relationship Y metric')).toHaveValue(
      'averageSpeedMph',
    )
  })

  it('renders a seasonal metric selector with all active metric options', () => {
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={seasonalView}
        onViewChange={() => {}}
      />,
    )

    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByLabelText('Seasonal metric')).toHaveValue('averageSpeedMph')
    expect(getOptionLabels('Seasonal metric')).toEqual([
      'Speed',
      'Distance',
      'Elevation',
      'Moving time',
    ])
  })

  it('renders a cumulative metric selector with additive metric options', () => {
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={cumulativeView}
        onViewChange={() => {}}
      />,
    )

    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByLabelText('Cumulative metric')).toHaveValue('distanceMiles')
    expect(getOptionLabels('Cumulative metric')).toEqual([
      'Distance',
      'Elevation',
      'Moving time',
    ])
  })

  it('updates only the trend y metric', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={trendView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Trend metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'trend',
      yMetric: 'distanceMiles',
    })
  })

  it('updates relationship X while preserving Y', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={relationshipView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Relationship X metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'relationship',
      xMetric: 'distanceMiles',
      yMetric: 'averageSpeedMph',
    })
  })

  it('updates relationship Y while preserving X', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={relationshipView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Relationship Y metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'relationship',
      xMetric: 'elevationGainFeet',
      yMetric: 'distanceMiles',
    })
  })

  it('updates seasonal metric while preserving aggregation', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={seasonalView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Seasonal metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'seasonal',
      yMetric: 'distanceMiles',
      aggregation: 'biweekly-median',
    })
  })

  it('updates cumulative metric while preserving accumulation', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={cumulativeView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Cumulative metric'), {
      target: { value: 'elevationGainFeet' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'cumulative',
      yMetric: 'elevationGainFeet',
      accumulation: 'continuous',
    })
  })

  it('allows same-metric relationship pairs', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={relationshipView}
        onViewChange={onViewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Relationship Y metric'), {
      target: { value: 'elevationGainFeet' },
    })

    expect(onViewChange).toHaveBeenCalledWith({
      type: 'relationship',
      xMetric: 'elevationGainFeet',
      yMetric: 'elevationGainFeet',
    })
  })

  it('does not offer average speed for cumulative views', () => {
    render(
      <MetricViewControls
        activities={[createActivity()]}
        view={cumulativeView}
        onViewChange={() => {}}
      />,
    )

    expect(getOptionLabels('Cumulative metric')).not.toContain('Speed')
  })
})

function getOptionLabels(selectName: string): string[] {
  const select = screen.getByLabelText(selectName)

  return Array.from(select.querySelectorAll('option')).map(
    (option) => option.textContent ?? '',
  )
}

const trendView: TrendViewConfiguration = {
  type: 'trend',
  yMetric: 'averageSpeedMph',
}

const relationshipView: RelationshipViewConfiguration = {
  type: 'relationship',
  xMetric: 'elevationGainFeet',
  yMetric: 'averageSpeedMph',
}

const seasonalView: SeasonalViewConfiguration = {
  type: 'seasonal',
  yMetric: 'averageSpeedMph',
  aggregation: 'biweekly-median',
}

const cumulativeView: CumulativeViewConfiguration = {
  type: 'cumulative',
  yMetric: 'distanceMiles',
  accumulation: 'continuous',
}

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
    >
  > = {},
): Activity {
  return {
    id: 'activity-a',
    startTime: '2025-01-01T07:00:00-07:00',
    localDate: '2025-01-01',
    year: 2025,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
