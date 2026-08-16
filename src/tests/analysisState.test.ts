import { describe, expect, it } from 'vitest'
import {
  defaultAnalysisState,
  supportedViewTypes,
  type AnalysisState,
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
      view: {
        type: 'trend',
        yMetric: 'averageSpeedMph',
      },
      aggregation: 'raw',
    })
    expect(defaultAnalysisState.comparison).toBeUndefined()
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
        colorBy: 'year',
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
