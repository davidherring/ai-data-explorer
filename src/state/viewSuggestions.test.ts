import { describe, expect, it } from 'vitest'
import {
  defaultAnalysisState,
  type AnalysisState,
} from './analysisState.ts'
import {
  buildViewSuggestion,
  getAnalysisStateFingerprint,
  proposeViewSuggestionInputSchema,
  ViewSuggestionError,
} from './viewSuggestions.ts'

describe('view suggestion contract', () => {
  it('builds a validated proposed state from a view patch', () => {
    const suggestion = buildViewSuggestion(defaultAnalysisState, {
      label: 'Inspect elevation relationship',
      rationale: 'Elevation may explain the speed pattern.',
      patch: {
        view: {
          type: 'relationship',
          xMetric: 'elevationGainFeet',
          yMetric: 'averageSpeedMph',
        },
      },
    })

    expect(suggestion).toMatchObject({
      label: 'Inspect elevation relationship',
      rationale: 'Elevation may explain the speed pattern.',
      proposedState: {
        selection: defaultAnalysisState.selection,
        view: {
          type: 'relationship',
          xMetric: 'elevationGainFeet',
          yMetric: 'averageSpeedMph',
        },
      },
      changes: [
        {
          field: 'view.type',
          action: 'set',
          label: 'View',
          value: 'Relationship',
        },
        {
          field: 'view.xMetric',
          action: 'set',
          label: 'X metric',
          value: 'Elevation gain',
        },
      ],
      sourceStateFingerprint: getAnalysisStateFingerprint(defaultAnalysisState),
    })
    expect(suggestion.id).toMatch(/^suggestion-[0-9a-f]{8}$/)
  })

  it('preserves source state except explicitly patched fields', () => {
    const sourceState: AnalysisState = {
      ...defaultAnalysisState,
      selection: {
        ...defaultAnalysisState.selection,
        years: [2025],
        distanceMiles: { min: 10, max: 40 },
      },
    }
    const suggestion = buildViewSuggestion(sourceState, {
      label: 'Use moving time trend',
      patch: {
        view: {
          type: 'trend',
          yMetric: 'movingTimeMinutes',
        },
        selection: {
          years: [2025, 2026],
        },
      },
    })

    expect(suggestion.proposedState.selection).toEqual({
      years: [2025, 2026],
      daysOfWeek: defaultAnalysisState.selection.daysOfWeek,
      recurringDateRange: defaultAnalysisState.selection.recurringDateRange,
      distanceMiles: { min: 10, max: 40 },
    })
    expect(suggestion.proposedState.view).toEqual({
      type: 'trend',
      yMetric: 'movingTimeMinutes',
    })
  })

  it('uses explicit empty arrays for required selection filters', () => {
    const sourceState: AnalysisState = {
      ...defaultAnalysisState,
      selection: {
        ...defaultAnalysisState.selection,
        years: [2025],
      },
    }
    const suggestion = buildViewSuggestion(sourceState, {
      label: 'Clear year selection',
      patch: {
        selection: {
          years: [],
        },
      },
    })

    expect(suggestion.proposedState.selection).toEqual({
      ...defaultAnalysisState.selection,
      years: [],
    })
    expect(suggestion.changes).toEqual([
      {
        field: 'selection.years',
        action: 'set',
        label: 'Years',
        value: '',
      },
    ])
  })

  it('replaces the complete view config and restores fixed seasonal fields', () => {
    const suggestion = buildViewSuggestion(defaultAnalysisState, {
      label: 'Compare seasonally',
      patch: {
        view: {
          type: 'seasonal',
          yMetric: 'distanceMiles',
        },
      },
    })

    expect(suggestion.proposedState.view).toEqual({
      type: 'seasonal',
      yMetric: 'distanceMiles',
      aggregation: 'biweekly-median',
    })
  })

  it('replaces the complete view config and restores fixed cumulative fields', () => {
    const suggestion = buildViewSuggestion(defaultAnalysisState, {
      label: 'Show cumulative distance',
      patch: {
        view: {
          type: 'cumulative',
          yMetric: 'distanceMiles',
        },
      },
    })

    expect(suggestion.proposedState.view).toEqual({
      type: 'cumulative',
      yMetric: 'distanceMiles',
      accumulation: 'continuous',
    })
  })

  it('rejects invalid view metric combinations', () => {
    expect(() =>
      buildViewSuggestion(defaultAnalysisState, {
        label: 'Invalid cumulative speed',
        patch: {
          view: {
            type: 'cumulative',
            yMetric: 'averageSpeedMph',
          },
        },
      } as never),
    ).toThrow()
  })

  it('rejects invalid recurring ranges in suggestion patches', () => {
    expect(() =>
      buildViewSuggestion(defaultAnalysisState, {
        label: 'Invalid seasonal window',
        patch: {
          selection: {
            recurringDateRange: {
              type: 'recurring-month-day',
              start: { month: 6, day: 20 },
              end: { month: 3, day: 15 },
            },
          },
        },
      }),
    ).toThrow()
  })

  it('rejects unsupported comparison, grouping, and unknown patch fields', () => {
    for (const patch of [
      { comparison: { years: [2025] } },
      { grouping: 'year' },
      { selection: { dayMode: 'weekend' } },
      { query: 'weekend activities' },
    ]) {
      expect(() =>
        proposeViewSuggestionInputSchema.parse({
          label: 'Unsupported',
          patch,
        }),
      ).toThrow()
    }
  })

  it('rejects no-op suggestion patches', () => {
    expect(() =>
      buildViewSuggestion(defaultAnalysisState, {
        label: 'Already selected',
        patch: {
          view: {
            type: 'trend',
            yMetric: 'averageSpeedMph',
          },
        },
      }),
    ).toThrow(ViewSuggestionError)
  })

  it('produces deterministic compact changes for selection patches', () => {
    const suggestion = buildViewSuggestion(defaultAnalysisState, {
      label: 'Focus the seasonal window',
      patch: {
        selection: {
          years: [2025, 2026],
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 3, day: 15 },
            end: { month: 6, day: 20 },
          },
          distanceMiles: { min: 10, max: 40 },
        },
      },
    })

    expect(suggestion.changes).toEqual([
      {
        field: 'selection.years',
        action: 'set',
        label: 'Years',
        value: '2025, 2026',
      },
      {
        field: 'selection.recurringDateRange',
        action: 'set',
        label: 'Seasonal window',
        value: '03-15-06-20',
      },
      {
        field: 'selection.distanceMiles',
        action: 'set',
        label: 'Distance',
        value: '10-40 mi',
      },
    ])
  })

  it('fingerprints equivalent object key ordering deterministically', () => {
    const first: AnalysisState = {
      selection: {
        years: [2025],
        daysOfWeek: ['saturday', 'sunday'],
        recurringDateRange: defaultAnalysisState.selection.recurringDateRange,
      },
      view: {
        type: 'trend',
        yMetric: 'distanceMiles',
      },
    }
    const second = {
      view: {
        yMetric: 'distanceMiles',
        type: 'trend',
      },
      selection: {
        daysOfWeek: ['saturday', 'sunday'],
        recurringDateRange: defaultAnalysisState.selection.recurringDateRange,
        years: [2025],
      },
    } as AnalysisState

    expect(getAnalysisStateFingerprint(first)).toBe(
      getAnalysisStateFingerprint(second),
    )
  })

  it('keeps array ordering significant in fingerprints', () => {
    const first: AnalysisState = {
      ...defaultAnalysisState,
      selection: { ...defaultAnalysisState.selection, years: [2025, 2026] },
    }
    const second: AnalysisState = {
      ...defaultAnalysisState,
      selection: { ...defaultAnalysisState.selection, years: [2026, 2025] },
    }

    expect(getAnalysisStateFingerprint(first)).not.toBe(
      getAnalysisStateFingerprint(second),
    )
  })
})
