import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import {
  getMetricDefinition,
  getMetricDefinitionsForRole,
  getMetricDisplay,
  getActivityMetric,
  hasFiniteMetricValue,
  type MetricDefinition,
  type MetricRole,
} from './activityMetrics.ts'

describe('getActivityMetric', () => {
  it('returns values for every current metric key', () => {
    const activity = createActivity({
      averageSpeedMph: 15.4,
      distanceMiles: 32.1,
      elevationGainFeet: 1840,
      movingTimeMinutes: 125,
      elapsedTimeMinutes: 141,
      temperatureF: 72,
    })

    expect(getActivityMetric(activity, 'averageSpeedMph')).toBe(15.4)
    expect(getActivityMetric(activity, 'distanceMiles')).toBe(32.1)
    expect(getActivityMetric(activity, 'elevationGainFeet')).toBe(1840)
    expect(getActivityMetric(activity, 'movingTimeMinutes')).toBe(125)
    expect(getActivityMetric(activity, 'elapsedTimeMinutes')).toBe(141)
    expect(getActivityMetric(activity, 'temperatureF')).toBe(72)
  })

  it('returns undefined for missing temperature', () => {
    expect(getActivityMetric(createActivity({ temperatureF: undefined }), 'temperatureF')).toBeUndefined()
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
      ['elapsedTimeMinutes', { label: 'Elapsed time', unit: 'min' }],
      ['temperatureF', { label: 'Temperature', unit: '°F' }],
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
          role: allRoles,
        },
      ],
      [
        'distanceMiles',
        {
          key: 'distanceMiles',
          label: 'Distance',
          shortLabel: 'Distance',
          unit: 'mi',
          role: allRoles,
        },
      ],
      [
        'elevationGainFeet',
        {
          key: 'elevationGainFeet',
          label: 'Elevation gain',
          shortLabel: 'Elevation',
          unit: 'ft',
          role: allRoles,
        },
      ],
      [
        'movingTimeMinutes',
        {
          key: 'movingTimeMinutes',
          label: 'Moving time',
          shortLabel: 'Moving time',
          unit: 'min',
          role: allRoles,
        },
      ],
      [
        'elapsedTimeMinutes',
        {
          key: 'elapsedTimeMinutes',
          label: 'Elapsed time',
          shortLabel: 'Elapsed time',
          unit: 'min',
          role: allRoles,
        },
      ],
      [
        'temperatureF',
        {
          key: 'temperatureF',
          label: 'Temperature',
          shortLabel: 'Temp',
          unit: '°F',
          role: allRoles,
          optional: true,
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
    expect(getMetricDefinition('elapsedTimeMinutes').format(141.4)).toBe('141')
    expect(getMetricDefinition('temperatureF').format(72.4)).toBe('72')
  })
})

describe('hasFiniteMetricValue', () => {
  it('returns false when no activities contain a finite value for the metric', () => {
    expect(hasFiniteMetricValue([], 'temperatureF')).toBe(false)
    expect(
      hasFiniteMetricValue(
        [
          createActivity({ temperatureF: undefined }),
          createActivity({ temperatureF: Number.NaN }),
          createActivity({ temperatureF: Number.POSITIVE_INFINITY }),
          createActivity({ temperatureF: Number.NEGATIVE_INFINITY }),
        ],
        'temperatureF',
      ),
    ).toBe(false)
  })

  it('returns true when at least one activity contains a finite value for the metric', () => {
    expect(
      hasFiniteMetricValue(
        [
          createActivity({ temperatureF: undefined }),
          createActivity({ temperatureF: 72 }),
        ],
        'temperatureF',
      ),
    ).toBe(true)
    expect(
      hasFiniteMetricValue([createActivity({ averageSpeedMph: 15 })], 'averageSpeedMph'),
    ).toBe(true)
  })
})

describe('getMetricDefinitionsForRole', () => {
  it('includes required metrics for every current role', () => {
    const requiredMetricKeys = [
      'averageSpeedMph',
      'distanceMiles',
      'elevationGainFeet',
      'movingTimeMinutes',
      'elapsedTimeMinutes',
    ] as const satisfies readonly MetricKey[]

    for (const role of metricRoles) {
      expect(
        getMetricDefinitionsForRole(role, [createActivity()]).map(
          (definition) => definition.key,
        ),
      ).toEqual(requiredMetricKeys)
    }
  })

  it('omits temperature when no supplied activities have finite temperature', () => {
    expect(
      getMetricDefinitionsForRole('trendY', [
        createActivity({ temperatureF: undefined }),
        createActivity({ temperatureF: Number.NaN }),
        createActivity({ temperatureF: Number.POSITIVE_INFINITY }),
        createActivity({ temperatureF: Number.NEGATIVE_INFINITY }),
      ]).map((definition) => definition.key),
    ).not.toContain('temperatureF')
  })

  it('includes temperature when at least one supplied activity has finite temperature', () => {
    for (const role of metricRoles) {
      expect(
        getMetricDefinitionsForRole(role, [
          createActivity({ temperatureF: undefined }),
          createActivity({ temperatureF: 72 }),
        ]).map((definition) => definition.key),
      ).toContain('temperatureF')
    }
  })
})

const allRoles = {
  trendY: true,
  relationshipX: true,
  relationshipY: true,
} as const satisfies Record<MetricRole, boolean>

const metricRoles = [
  'trendY',
  'relationshipX',
  'relationshipY',
] as const satisfies readonly MetricRole[]

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'elapsedTimeMinutes'
      | 'temperatureF'
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
