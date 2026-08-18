import { describe, expect, it } from 'vitest'
import {
  defaultAnalysisState,
  defaultRelationshipView,
  defaultTrendView,
  supportedViewTypes,
  type AnalysisState,
  type RelationshipViewConfiguration,
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
      aggregation: 'raw',
    })
    expect(defaultAnalysisState.comparison).toBeUndefined()
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
      aggregation: 'raw',
    }

    expect(comparisonState.comparison).toMatchObject({
      years: [2023, 2024, 2025],
      sportType: 'Ride',
    })
    expect(supportedViewTypes).toContain(comparisonState.view.type)
  })
})
