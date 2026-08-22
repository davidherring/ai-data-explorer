import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from './metricRelationships.ts'

describe('relationshipBetweenMetrics', () => {
  it('calculates a positive Pearson correlation', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
        createActivity({ id: 'd', elevationGainFeet: 400, averageSpeedMph: 17 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('ready')
    expect(result.pearsonR).toBeGreaterThan(0)
  })

  it('calculates a negative Pearson correlation', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 18 }),
        createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 16 }),
        createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 14 }),
        createActivity({ id: 'd', elevationGainFeet: 400, averageSpeedMph: 13 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('ready')
    expect(result.pearsonR).toBeLessThan(0)
  })

  it('calculates perfect correlation without rounding', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 10 }),
        createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 20 }),
        createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 30 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('ready')
    expect(result.pearsonR).toBeCloseTo(1)
  })

  it('returns insufficient-valid-pairs for empty input', () => {
    expect(
      relationshipBetweenMetrics([], 'elevationGainFeet', 'averageSpeedMph'),
    ).toEqual({
      xMetric: 'elevationGainFeet',
      yMetric: 'averageSpeedMph',
      sampleCount: 0,
      validPairCount: 0,
      status: 'insufficient-valid-pairs',
    })
  })

  it('returns insufficient-valid-pairs for one valid pair', () => {
    const result = relationshipBetweenMetrics(
      [createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 })],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 1,
      validPairCount: 1,
      xMin: 100,
      xMax: 100,
      yMin: 12,
      yMax: 12,
      status: 'insufficient-valid-pairs',
    })
    expect(result.pearsonR).toBeUndefined()
  })

  it('returns insufficient-valid-pairs for two valid pairs', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 2,
      validPairCount: 2,
      xMin: 100,
      xMax: 200,
      yMin: 12,
      yMax: 14,
      status: 'insufficient-valid-pairs',
    })
    expect(result.pearsonR).toBeUndefined()
  })

  it('excludes non-finite metric values', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', distanceMiles: 60, averageSpeedMph: 12 }),
        createActivity({ id: 'b', distanceMiles: Number.NaN, averageSpeedMph: 99 }),
        createActivity({ id: 'c', distanceMiles: 70, averageSpeedMph: 14 }),
        createActivity({ id: 'd', distanceMiles: 80, averageSpeedMph: 16 }),
      ],
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 4,
      validPairCount: 3,
      xMin: 60,
      xMax: 80,
      yMin: 12,
      yMax: 16,
      status: 'ready',
    })
    expect(result.pearsonR).toBeCloseTo(1)
  })

  it('excludes NaN metric values', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: Number.NaN, averageSpeedMph: 99 }),
        createActivity({ id: 'c', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createActivity({ id: 'd', elevationGainFeet: 300, averageSpeedMph: 16 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 4,
      validPairCount: 3,
      xMin: 100,
      xMax: 300,
      yMin: 12,
      yMax: 16,
      status: 'ready',
    })
  })

  it('excludes Infinity and -Infinity metric values', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: Number.POSITIVE_INFINITY, averageSpeedMph: 99 }),
        createActivity({ id: 'c', elevationGainFeet: 200, averageSpeedMph: Number.NEGATIVE_INFINITY }),
        createActivity({ id: 'd', elevationGainFeet: 300, averageSpeedMph: 16 }),
        createActivity({ id: 'e', elevationGainFeet: 400, averageSpeedMph: 18 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 5,
      validPairCount: 3,
      xMin: 100,
      xMax: 400,
      yMin: 12,
      yMax: 18,
      status: 'ready',
    })
  })

  it('returns zero-x-variance when x does not vary', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 14 }),
        createActivity({ id: 'c', elevationGainFeet: 100, averageSpeedMph: 16 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('zero-x-variance')
    expect(result.pearsonR).toBeUndefined()
  })

  it('returns zero-y-variance when y does not vary', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 12 }),
        createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 12 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('zero-y-variance')
    expect(result.pearsonR).toBeUndefined()
  })

  it('returns zero-x-variance when both metrics have zero variance', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'c', elevationGainFeet: 100, averageSpeedMph: 12 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result.status).toBe('zero-x-variance')
    expect(result.pearsonR).toBeUndefined()
  })

  it('uses valid pairs only for ranges', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 10, averageSpeedMph: Number.NaN }),
        createActivity({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createActivity({ id: 'c', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createActivity({ id: 'd', elevationGainFeet: Number.POSITIVE_INFINITY, averageSpeedMph: 100 }),
        createActivity({ id: 'e', elevationGainFeet: 300, averageSpeedMph: 16 }),
      ],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(result).toMatchObject({
      sampleCount: 5,
      validPairCount: 3,
      xMin: 100,
      xMax: 300,
      yMin: 12,
      yMax: 16,
    })
  })

  it('does not mutate source data or reorder activities', () => {
    const activities = [
      createActivity({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createActivity({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
      createActivity({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
    ]
    const originalActivities = activities.map((activity) => ({ ...activity }))
    const originalIds = activities.map((activity) => activity.id)

    relationshipBetweenMetrics(activities, 'elevationGainFeet', 'averageSpeedMph')

    expect(activities).toEqual(originalActivities)
    expect(activities.map((activity) => activity.id)).toEqual(originalIds)
  })

  it('supports matching x and y metrics when variance is non-zero', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100 }),
        createActivity({ id: 'b', elevationGainFeet: 200 }),
        createActivity({ id: 'c', elevationGainFeet: 300 }),
      ],
      'elevationGainFeet',
      'elevationGainFeet',
    )

    expect(result.status).toBe('ready')
    expect(result.pearsonR).toBeCloseTo(1)
  })

  it('uses zero-x-variance precedence for matching constant metrics', () => {
    const result = relationshipBetweenMetrics(
      [
        createActivity({ id: 'a', elevationGainFeet: 100 }),
        createActivity({ id: 'b', elevationGainFeet: 100 }),
        createActivity({ id: 'c', elevationGainFeet: 100 }),
      ],
      'elevationGainFeet',
      'elevationGainFeet',
    )

    expect(result.status).toBe('zero-x-variance')
  })
})

describe('getMetricRelationshipPoints', () => {
  it('excludes undefined and non-finite pairs', () => {
    const activities = [
      createActivity({ id: 'valid-a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createActivity({ id: 'nan-x', elevationGainFeet: Number.NaN, averageSpeedMph: 13 }),
      createActivity({ id: 'nan-y', elevationGainFeet: 150, averageSpeedMph: Number.NaN }),
      createActivity({
        id: 'infinite-x',
        elevationGainFeet: Number.POSITIVE_INFINITY,
        averageSpeedMph: 15,
      }),
      createActivity({
        id: 'infinite-y',
        elevationGainFeet: 200,
        averageSpeedMph: Number.NEGATIVE_INFINITY,
      }),
      createActivity({ id: 'valid-b', elevationGainFeet: 300, averageSpeedMph: 16 }),
    ]

    expect(
      getMetricRelationshipPoints(activities, 'elevationGainFeet', 'averageSpeedMph').map(
        (point) => point.activity.id,
      ),
    ).toEqual(['valid-a', 'valid-b'])
  })

  it('preserves source order for valid points', () => {
    const activities = [
      createActivity({ id: 'activity-c', elevationGainFeet: 300, averageSpeedMph: 16 }),
      createActivity({ id: 'activity-a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createActivity({ id: 'activity-b', elevationGainFeet: 200, averageSpeedMph: 14 }),
    ]

    expect(
      getMetricRelationshipPoints(activities, 'elevationGainFeet', 'averageSpeedMph').map(
        (point) => point.activity.id,
      ),
    ).toEqual(['activity-c', 'activity-a', 'activity-b'])
  })

  it('retains the original activity reference', () => {
    const activity = createActivity({
      id: 'activity-a',
      elevationGainFeet: 100,
      averageSpeedMph: 12,
    })
    const [point] = getMetricRelationshipPoints(
      [activity],
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(point).toMatchObject({ x: 100, y: 12 })
    expect(point.activity).toBe(activity)
  })

  it('does not mutate activities', () => {
    const activities = [
      createActivity({ id: 'activity-a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createActivity({ id: 'activity-b', elevationGainFeet: 200, averageSpeedMph: 14 }),
    ]
    const originalActivities = activities.map((activity) => ({ ...activity }))

    getMetricRelationshipPoints(activities, 'elevationGainFeet', 'averageSpeedMph')

    expect(activities).toEqual(originalActivities)
  })
})

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'id'
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
    >
  > = {},
): Activity {
  return {
    id: overrides.id ?? 'activity-a',
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
