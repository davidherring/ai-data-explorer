import { describe, expect, it } from 'vitest'
import {
  defaultCumulativeView,
  defaultAnalysisState,
  defaultRelationshipView,
  defaultSeasonalView,
  defaultTrendView,
  supportedViewTypes,
  type AnalysisState,
  type CumulativeViewConfiguration,
  type RelationshipViewConfiguration,
  type SeasonalViewConfiguration,
  type TrendViewConfiguration,
} from '../state/analysisState.ts'

describe('analysis state contract', () => {
  it('defines the supported MVP view identifiers', () => {
    expect(supportedViewTypes).toEqual([
      'trend',
      'relationship',
      'seasonal',
      'cumulative',
    ])
  })

  it('provides a default single-selection trend state', () => {
    expect(defaultAnalysisState).toEqual({
      selection: {
        dayMode: 'all',
      },
      view: defaultTrendView,
    })
    expect(defaultAnalysisState.comparison).toBeUndefined()
    expect(defaultAnalysisState).not.toHaveProperty('aggregation')
  })

  it('defines the default trend view configuration', () => {
    expect(defaultTrendView).toEqual({
      type: 'trend',
      yMetric: 'averageSpeedMph',
    })
  })

  it('defines the default relationship view configuration', () => {
    expect(defaultRelationshipView).toEqual({
      type: 'relationship',
      xMetric: 'elevationGainFeet',
      yMetric: 'averageSpeedMph',
    })
  })

  it('defines the default seasonal view configuration', () => {
    expect(defaultSeasonalView).toEqual({
      type: 'seasonal',
      yMetric: 'averageSpeedMph',
      aggregation: 'biweekly-median',
    })
  })

  it('defines the default cumulative view configuration', () => {
    expect(defaultCumulativeView).toEqual({
      type: 'cumulative',
      yMetric: 'distanceMiles',
      accumulation: 'continuous',
    })
  })

  it('represents trend metric configuration explicitly', () => {
    const trendView: TrendViewConfiguration = {
      type: 'trend',
      yMetric: 'distanceMiles',
    }

    expect(trendView).toEqual({
      type: 'trend',
      yMetric: 'distanceMiles',
    })
  })

  it('represents relationship metric configuration explicitly', () => {
    const relationshipView: RelationshipViewConfiguration = {
      type: 'relationship',
      xMetric: 'distanceMiles',
      yMetric: 'averageSpeedMph',
    }

    expect(relationshipView).toEqual({
      type: 'relationship',
      xMetric: 'distanceMiles',
      yMetric: 'averageSpeedMph',
    })
  })

  it('represents seasonal metric and aggregation configuration explicitly', () => {
    const seasonalView: SeasonalViewConfiguration = {
      type: 'seasonal',
      yMetric: 'distanceMiles',
      aggregation: 'biweekly-median',
    }

    expect(seasonalView).toEqual({
      type: 'seasonal',
      yMetric: 'distanceMiles',
      aggregation: 'biweekly-median',
    })
  })

  it('represents cumulative metric and accumulation configuration explicitly', () => {
    const cumulativeView: CumulativeViewConfiguration = {
      type: 'cumulative',
      yMetric: 'elevationGainFeet',
      accumulation: 'continuous',
    }

    expect(cumulativeView).toEqual({
      type: 'cumulative',
      yMetric: 'elevationGainFeet',
      accumulation: 'continuous',
    })
  })

  it('prevents average speed as a cumulative view metric at the type level', () => {
    const cumulativeView: CumulativeViewConfiguration = {
      type: 'cumulative',
      // @ts-expect-error Cumulative only supports additive metrics.
      yMetric: 'averageSpeedMph',
      accumulation: 'continuous',
    }

    expect(cumulativeView.yMetric).toBe('averageSpeedMph')
  })

  it('represents a recurring month-day selection explicitly', () => {
    const state: AnalysisState = {
      selection: {
        years: [2017, 2020, 2025],
        recurringDateRange: {
          type: 'recurring-month-day',
          start: { month: 3, day: 15 },
          end: { month: 6, day: 20 },
        },
      },
      view: defaultTrendView,
    }

    expect(state.selection.recurringDateRange).toEqual({
      type: 'recurring-month-day',
      start: { month: 3, day: 15 },
      end: { month: 6, day: 20 },
    })
  })

  it('allows an optional comparison using the same selection shape', () => {
    const comparisonState: AnalysisState = {
      selection: {
        years: [2026],
        dayMode: 'weekday',
        daysOfWeek: ['wednesday'],
        distanceMiles: { min: 10, max: 30 },
        elevationGainFeet: { min: 1000, max: 2200 },
        sportType: 'Ride',
      },
      comparison: {
        years: [2023, 2024, 2025],
        dayMode: 'weekday',
        daysOfWeek: ['wednesday'],
        distanceMiles: { min: 10, max: 30 },
        elevationGainFeet: { min: 1000, max: 2200 },
        sportType: 'Ride',
      },
      view: {
        type: 'relationship',
        xMetric: 'elevationGainFeet',
        yMetric: 'averageSpeedMph',
      },
      grouping: 'year',
    }

    expect(comparisonState.comparison).toMatchObject({
      years: [2023, 2024, 2025],
      sportType: 'Ride',
    })
    expect(supportedViewTypes).toContain(comparisonState.view.type)
  })
})
