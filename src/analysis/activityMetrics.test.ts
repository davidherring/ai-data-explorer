import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import {
  getDefaultMetricForView,
  getMetricDefinition,
  getMetricDefinitionsForView,
  getMetricDisplay,
  getActivityMetric,
  hasFiniteMetricValue,
  isMetricValidForView,
  type MetricDefinition,
} from './activityMetrics.ts'

const activeMetricKeys = [
  'averageSpeedMph',
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly MetricKey[]

describe('getActivityMetric', () => {
  it('returns values for every current metric key', () => {
    const activity = createActivity({
      averageSpeedMph: 15.4,
      distanceMiles: 32.1,
      elevationGainFeet: 1840,
      movingTimeMinutes: 125,
    })

    expect(getActivityMetric(activity, 'averageSpeedMph')).toBe(15.4)
    expect(getActivityMetric(activity, 'distanceMiles')).toBe(32.1)
    expect(getActivityMetric(activity, 'elevationGainFeet')).toBe(1840)
    expect(getActivityMetric(activity, 'movingTimeMinutes')).toBe(125)
  })

  it('does not normalize NaN or non-finite values', () => {
    const activity = createActivity({
      averageSpeedMph: Number.NaN,
      distanceMiles: Number.POSITIVE_INFINITY,
      elevationGainFeet: Number.NEGATIVE_INFINITY,
    })

    expect(getActivityMetric(activity, 'averageSpeedMph')).toBeNaN()
    expect(getActivityMetric(activity, 'distanceMiles')).toBe(Number.POSITIVE_INFINITY)
    expect(getActivityMetric(activity, 'elevationGainFeet')).toBe(Number.NEGATIVE_INFINITY)
  })
})

describe('getMetricDisplay', () => {
  it('returns minimal labels and units for every current metric key', () => {
    const expectedDisplays = new Map<MetricKey, { label: string; unit: string }>([
      ['averageSpeedMph', { label: 'Average speed', unit: 'mph' }],
      ['distanceMiles', { label: 'Distance', unit: 'mi' }],
      ['elevationGainFeet', { label: 'Elevation gain', unit: 'ft' }],
      ['movingTimeMinutes', { label: 'Moving time', unit: 'min' }],
    ])

    for (const [metricKey, display] of expectedDisplays) {
      expect(getMetricDisplay(metricKey)).toEqual(display)
    }
  })
})

describe('getMetricDefinition', () => {
  it('returns metadata for every current metric key', () => {
    const expectedDefinitions = new Map<
      MetricKey,
      Omit<MetricDefinition, 'format'>
    >([
      [
        'averageSpeedMph',
        {
          key: 'averageSpeedMph',
          label: 'Average speed',
          shortLabel: 'Speed',
          unit: 'mph',
        },
      ],
      [
        'distanceMiles',
        {
          key: 'distanceMiles',
          label: 'Distance',
          shortLabel: 'Distance',
          unit: 'mi',
        },
      ],
      [
        'elevationGainFeet',
        {
          key: 'elevationGainFeet',
          label: 'Elevation gain',
          shortLabel: 'Elevation',
          unit: 'ft',
        },
      ],
      [
        'movingTimeMinutes',
        {
          key: 'movingTimeMinutes',
          label: 'Moving time',
          shortLabel: 'Moving time',
          unit: 'min',
        },
      ],
    ])

    for (const [metricKey, expectedDefinition] of expectedDefinitions) {
      const definition = getMetricDefinition(metricKey)

      expect(definition).toMatchObject(expectedDefinition)
      expect(definition.format).toEqual(expect.any(Function))
    }
  })

  it('formats metric values without appending units', () => {
    expect(getMetricDefinition('averageSpeedMph').format(15.24)).toBe('15.2')
    expect(getMetricDefinition('distanceMiles').format(31.44)).toBe('31.4')
    expect(getMetricDefinition('elevationGainFeet').format(1250)).toBe('1,250')
    expect(getMetricDefinition('movingTimeMinutes').format(125.4)).toBe('125')
  })
})

describe('hasFiniteMetricValue', () => {
  it('returns false when no activities contain a finite value for the metric', () => {
    expect(hasFiniteMetricValue([], 'averageSpeedMph')).toBe(false)
    expect(
      hasFiniteMetricValue(
        [
          createActivity({ averageSpeedMph: Number.NaN }),
          createActivity({ averageSpeedMph: Number.POSITIVE_INFINITY }),
          createActivity({ averageSpeedMph: Number.NEGATIVE_INFINITY }),
        ],
        'averageSpeedMph',
      ),
    ).toBe(false)
  })

  it('returns true when at least one activity contains a finite value for the metric', () => {
    expect(
      hasFiniteMetricValue(
        [
          createActivity({ averageSpeedMph: Number.NaN }),
          createActivity({ averageSpeedMph: 15 }),
        ],
        'averageSpeedMph',
      ),
    ).toBe(true)
  })
})

describe('view metric validity', () => {
  it('returns all active metrics for trend, relationship, and seasonal views', () => {
    for (const viewType of ['trend', 'relationship', 'seasonal'] as const) {
      expect(
        getMetricDefinitionsForView(viewType, [createActivity()]).map(
          (definition) => definition.key,
        ),
      ).toEqual(activeMetricKeys)
      expect(getDefaultMetricForView(viewType)).toBe('averageSpeedMph')
    }
  })

  it('returns only additive metrics for cumulative views', () => {
    expect(
      getMetricDefinitionsForView('cumulative', [createActivity()]).map(
        (definition) => definition.key,
      ),
    ).toEqual(['distanceMiles', 'elevationGainFeet', 'movingTimeMinutes'])
    expect(getDefaultMetricForView('cumulative')).toBe('distanceMiles')
  })

  it('checks whether a metric is valid for a view', () => {
    expect(isMetricValidForView('trend', 'averageSpeedMph')).toBe(true)
    expect(isMetricValidForView('cumulative', 'averageSpeedMph')).toBe(false)
    expect(isMetricValidForView('cumulative', 'movingTimeMinutes')).toBe(true)
  })
})

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
