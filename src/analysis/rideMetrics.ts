import type { Ride } from '../data/ride.js'
import type { MetricKey } from '../state/analysisState.js'

export type MetricRole = 'trendY' | 'relationshipX' | 'relationshipY'

export type MetricDefinition = {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  role: Record<MetricRole, boolean>
  optional?: boolean
  format: (value: number) => string
}

export type MetricDisplay = {
  label: string
  unit: string
}

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})
const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const allCurrentViewRoles = {
  trendY: true,
  relationshipX: true,
  relationshipY: true,
} as const satisfies Record<MetricRole, boolean>

export const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  averageSpeedMph: {
    key: 'averageSpeedMph',
    label: 'Average speed',
    shortLabel: 'Speed',
    unit: 'mph',
    role: allCurrentViewRoles,
    format: formatDecimal,
  },
  distanceMiles: {
    key: 'distanceMiles',
    label: 'Distance',
    shortLabel: 'Distance',
    unit: 'mi',
    role: allCurrentViewRoles,
    format: formatDecimal,
  },
  elevationGainFeet: {
    key: 'elevationGainFeet',
    label: 'Elevation gain',
    shortLabel: 'Elevation',
    unit: 'ft',
    role: allCurrentViewRoles,
    format: formatWholeNumber,
  },
  movingTimeMinutes: {
    key: 'movingTimeMinutes',
    label: 'Moving time',
    shortLabel: 'Moving time',
    unit: 'min',
    role: allCurrentViewRoles,
    format: formatWholeNumber,
  },
  elapsedTimeMinutes: {
    key: 'elapsedTimeMinutes',
    label: 'Elapsed time',
    shortLabel: 'Elapsed time',
    unit: 'min',
    role: allCurrentViewRoles,
    format: formatWholeNumber,
  },
  temperatureF: {
    key: 'temperatureF',
    label: 'Temperature',
    shortLabel: 'Temp',
    unit: '°F',
    role: allCurrentViewRoles,
    optional: true,
    format: formatWholeNumber,
  },
}

export function getRideMetric(
  ride: Ride,
  metricKey: MetricKey,
): number | undefined {
  switch (metricKey) {
    case 'averageSpeedMph':
      return ride.averageSpeedMph
    case 'distanceMiles':
      return ride.distanceMiles
    case 'elevationGainFeet':
      return ride.elevationGainFeet
    case 'movingTimeMinutes':
      return ride.movingTimeMinutes
    case 'elapsedTimeMinutes':
      return ride.elapsedTimeMinutes
    case 'temperatureF':
      return ride.temperatureF
  }
}

export function getMetricDefinition(metricKey: MetricKey): MetricDefinition {
  return metricDefinitions[metricKey]
}

export function getMetricDisplay(metricKey: MetricKey): MetricDisplay {
  const { label, unit } = getMetricDefinition(metricKey)

  return { label, unit }
}

export function hasFiniteMetricValue(
  rides: readonly Ride[],
  metricKey: MetricKey,
): boolean {
  return rides.some((ride) => {
    const value = getRideMetric(ride, metricKey)

    return value !== undefined && Number.isFinite(value)
  })
}

export function getMetricDefinitionsForRole(
  role: MetricRole,
  rides: readonly Ride[],
): MetricDefinition[] {
  return Object.values(metricDefinitions).filter(
    (definition) =>
      definition.role[role] &&
      (!definition.optional || hasFiniteMetricValue(rides, definition.key)),
  )
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

function formatWholeNumber(value: number): string {
  return wholeNumberFormatter.format(Math.round(value))
}
