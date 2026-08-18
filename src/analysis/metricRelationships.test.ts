import { describe, expect, it } from 'vitest'
import type { DayOfWeek, Ride } from '../data/ride.ts'
import { relationshipBetweenMetrics } from './metricRelationships.ts'

describe('relationshipBetweenMetrics', () => {
  it('calculates a positive Pearson correlation', () => {
    const result = relationshipBetweenMetrics(
      [
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
        createRide({ id: 'd', elevationGainFeet: 400, averageSpeedMph: 17 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 18 }),
        createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 16 }),
        createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 14 }),
        createRide({ id: 'd', elevationGainFeet: 400, averageSpeedMph: 13 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 10 }),
        createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 20 }),
        createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 30 }),
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
      [createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 })],
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
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

  it('excludes missing optional metric values', () => {
    const result = relationshipBetweenMetrics(
      [
        createRide({ id: 'a', temperatureF: 60, averageSpeedMph: 12 }),
        createRide({ id: 'b', temperatureF: undefined, averageSpeedMph: 99 }),
        createRide({ id: 'c', temperatureF: 70, averageSpeedMph: 14 }),
        createRide({ id: 'd', temperatureF: 80, averageSpeedMph: 16 }),
      ],
      'temperatureF',
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: Number.NaN, averageSpeedMph: 99 }),
        createRide({ id: 'c', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createRide({ id: 'd', elevationGainFeet: 300, averageSpeedMph: 16 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: Number.POSITIVE_INFINITY, averageSpeedMph: 99 }),
        createRide({ id: 'c', elevationGainFeet: 200, averageSpeedMph: Number.NEGATIVE_INFINITY }),
        createRide({ id: 'd', elevationGainFeet: 300, averageSpeedMph: 16 }),
        createRide({ id: 'e', elevationGainFeet: 400, averageSpeedMph: 18 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 14 }),
        createRide({ id: 'c', elevationGainFeet: 100, averageSpeedMph: 16 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 12 }),
        createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 12 }),
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
        createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'c', elevationGainFeet: 100, averageSpeedMph: 12 }),
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
        createRide({ id: 'a', elevationGainFeet: 10, averageSpeedMph: Number.NaN }),
        createRide({ id: 'b', elevationGainFeet: 100, averageSpeedMph: 12 }),
        createRide({ id: 'c', elevationGainFeet: 200, averageSpeedMph: 14 }),
        createRide({ id: 'd', elevationGainFeet: Number.POSITIVE_INFINITY, averageSpeedMph: 100 }),
        createRide({ id: 'e', elevationGainFeet: 300, averageSpeedMph: 16 }),
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

  it('does not mutate source data or reorder rides', () => {
    const rides = [
      createRide({ id: 'a', elevationGainFeet: 100, averageSpeedMph: 12 }),
      createRide({ id: 'b', elevationGainFeet: 200, averageSpeedMph: 14 }),
      createRide({ id: 'c', elevationGainFeet: 300, averageSpeedMph: 16 }),
    ]
    const originalRides = rides.map((ride) => ({ ...ride }))
    const originalIds = rides.map((ride) => ride.id)

    relationshipBetweenMetrics(rides, 'elevationGainFeet', 'averageSpeedMph')

    expect(rides).toEqual(originalRides)
    expect(rides.map((ride) => ride.id)).toEqual(originalIds)
  })

  it('supports matching x and y metrics when variance is non-zero', () => {
    const result = relationshipBetweenMetrics(
      [
        createRide({ id: 'a', elevationGainFeet: 100 }),
        createRide({ id: 'b', elevationGainFeet: 200 }),
        createRide({ id: 'c', elevationGainFeet: 300 }),
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
        createRide({ id: 'a', elevationGainFeet: 100 }),
        createRide({ id: 'b', elevationGainFeet: 100 }),
        createRide({ id: 'c', elevationGainFeet: 100 }),
      ],
      'elevationGainFeet',
      'elevationGainFeet',
    )

    expect(result.status).toBe('zero-x-variance')
  })
})

function createRide(
  overrides: Partial<
    Pick<
      Ride,
      | 'id'
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
    id: overrides.id ?? 'ride-a',
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
