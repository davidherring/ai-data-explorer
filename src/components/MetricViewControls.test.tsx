import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
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

  it('renders one trend metric selector with role-derived options', () => {
    render(
      <MetricViewControls
        rides={[createRide()]}
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
      'Elapsed time',
    ])
  })

  it('renders relationship X and Y metric selectors', () => {
    render(
      <MetricViewControls
        rides={[createRide()]}
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

  it('renders a seasonal metric selector with trend-compatible options', () => {
    render(
      <MetricViewControls
        rides={[createRide()]}
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
      'Elapsed time',
    ])
  })

  it('renders a cumulative metric selector with trend-compatible options', () => {
    render(
      <MetricViewControls
        rides={[createRide()]}
        view={cumulativeView}
        onViewChange={() => {}}
      />,
    )

    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByLabelText('Cumulative metric')).toHaveValue('distanceMiles')
    expect(getOptionLabels('Cumulative metric')).toEqual([
      'Speed',
      'Distance',
      'Elevation',
      'Moving time',
      'Elapsed time',
    ])
  })

  it('updates only the trend y metric', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        rides={[createRide()]}
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
        rides={[createRide()]}
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
        rides={[createRide()]}
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
        rides={[createRide()]}
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
        rides={[createRide()]}
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
        rides={[createRide()]}
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

  it('omits temperature when no source rides have finite temperature', () => {
    render(
      <MetricViewControls
        rides={[
          createRide({ temperatureF: undefined }),
          createRide({ temperatureF: Number.NaN }),
          createRide({ temperatureF: Number.POSITIVE_INFINITY }),
        ]}
        view={trendView}
        onViewChange={() => {}}
      />,
    )

    expect(getOptionLabels('Trend metric')).not.toContain('Temp')
  })

  it('includes temperature when at least one source ride has finite temperature', () => {
    render(
      <MetricViewControls
        rides={[
          createRide({ temperatureF: undefined }),
          createRide({ temperatureF: 72 }),
        ]}
        view={trendView}
        onViewChange={() => {}}
      />,
    )

    expect(getOptionLabels('Trend metric')).toContain('Temp')
  })

  it('renders a temporary selected option for unavailable current temperature', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        rides={[createRide({ temperatureF: undefined })]}
        view={{
          type: 'trend',
          yMetric: 'temperatureF',
        }}
        onViewChange={onViewChange}
      />,
    )

    expect(screen.getByLabelText('Trend metric')).toHaveValue('temperatureF')
    expect(getOptionLabels('Trend metric')).toContain('Temp unavailable')
    expect(onViewChange).not.toHaveBeenCalled()
  })

  it('replaces unavailable current temperature when another valid option is selected', () => {
    const onViewChange = vi.fn()
    render(
      <MetricViewControls
        rides={[createRide({ temperatureF: undefined })]}
        view={{
          type: 'trend',
          yMetric: 'temperatureF',
        }}
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

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
    >
  > = {},
): Ride {
  return {
    id: 'ride-a',
    startTime: '2025-01-01T07:00:00-07:00',
    localDate: '2025-01-01',
    year: 2025,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    elapsedTimeMinutes: overrides.elapsedTimeMinutes ?? 65,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    temperatureF: overrides.temperatureF,
    sportType: 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
