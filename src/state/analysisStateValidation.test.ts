import { describe, expect, it } from 'vitest'
import { defaultAnalysisState } from './analysisState.ts'
import { analysisStateSchema } from './analysisStateValidation.ts'

describe('analysisStateSchema', () => {
  it('accepts the current default analysis state', () => {
    expect(analysisStateSchema.parse(defaultAnalysisState)).toEqual(
      defaultAnalysisState,
    )
  })

  it('rejects obsolete top-level aggregation state', () => {
    expect(() =>
      analysisStateSchema.parse({
        ...defaultAnalysisState,
        aggregation: 'raw',
      }),
    ).toThrow()
  })

  it('rejects retired metric keys', () => {
    for (const metric of ['elapsedTimeMinutes', 'temperatureF']) {
      expect(() =>
        analysisStateSchema.parse({
          ...defaultAnalysisState,
          view: {
            type: 'trend',
            yMetric: metric,
          },
        }),
      ).toThrow()
    }
  })

  it('rejects average speed as a cumulative metric', () => {
    expect(() =>
      analysisStateSchema.parse({
        ...defaultAnalysisState,
        view: {
          type: 'cumulative',
          yMetric: 'averageSpeedMph',
          accumulation: 'continuous',
        },
      }),
    ).toThrow()
  })

  it('accepts Feb 29 recurring month-day ranges', () => {
    expect(
      analysisStateSchema.parse({
        ...defaultAnalysisState,
        selection: {
          recurringDateRange: {
            type: 'recurring-month-day',
            start: { month: 2, day: 29 },
            end: { month: 3, day: 1 },
          },
        },
      }),
    ).toMatchObject({
      selection: {
        recurringDateRange: {
          start: { month: 2, day: 29 },
          end: { month: 3, day: 1 },
        },
      },
    })
  })

  it('rejects invalid or reversed recurring month-day ranges', () => {
    for (const recurringDateRange of [
      {
        type: 'recurring-month-day',
        start: { month: 2, day: 30 },
        end: { month: 3, day: 1 },
      },
      {
        type: 'recurring-month-day',
        start: { month: 6, day: 20 },
        end: { month: 3, day: 15 },
      },
    ]) {
      expect(() =>
        analysisStateSchema.parse({
          ...defaultAnalysisState,
          selection: { recurringDateRange },
        }),
      ).toThrow()
    }
  })

  it('rejects unknown state fields', () => {
    expect(() =>
      analysisStateSchema.parse({
        ...defaultAnalysisState,
        unexpected: true,
      }),
    ).toThrow()
  })
})
