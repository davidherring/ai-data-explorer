import type { Activity } from '../data/activity.js'
import type {
  CumulativeMetricKey,
  MetricKey,
  ViewType,
} from '../state/analysisState.js'

export type MetricViewType = ViewType

export type MetricDefinition = {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
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

const allActiveMetricKeys = [
  'averageSpeedMph',
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly MetricKey[]

const cumulativeMetricKeys = [
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
] as const satisfies readonly CumulativeMetricKey[]

export const metricKeysByView = {
  trend: allActiveMetricKeys,
  relationship: allActiveMetricKeys,
  seasonal: allActiveMetricKeys,
  cumulative: cumulativeMetricKeys,
} as const satisfies Record<MetricViewType, readonly MetricKey[]>

export const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  averageSpeedMph: {
    key: 'averageSpeedMph',
    label: 'Average speed',
    shortLabel: 'Speed',
    unit: 'mph',
    format: formatDecimal,
  },
  distanceMiles: {
    key: 'distanceMiles',
    label: 'Distance',
    shortLabel: 'Distance',
    unit: 'mi',
    format: formatDecimal,
  },
  elevationGainFeet: {
    key: 'elevationGainFeet',
    label: 'Elevation gain',
    shortLabel: 'Elevation',
    unit: 'ft',
    format: formatWholeNumber,
  },
  movingTimeMinutes: {
    key: 'movingTimeMinutes',
    label: 'Moving time',
    shortLabel: 'Moving time',
    unit: 'min',
    format: formatWholeNumber,
  },
}

export function getActivityMetric(
  activity: Activity,
  metricKey: MetricKey,
): number | undefined {
  switch (metricKey) {
    case 'averageSpeedMph':
      return activity.averageSpeedMph
    case 'distanceMiles':
      return activity.distanceMiles
    case 'elevationGainFeet':
      return activity.elevationGainFeet
    case 'movingTimeMinutes':
      return activity.movingTimeMinutes
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
  activities: readonly Activity[],
  metricKey: MetricKey,
): boolean {
  return activities.some((activity) => {
    const value = getActivityMetric(activity, metricKey)

    return value !== undefined && Number.isFinite(value)
  })
}

export function getMetricDefinitionsForView(
  viewType: MetricViewType,
  _activities: readonly Activity[],
): MetricDefinition[] {
  return metricKeysByView[viewType].map((metricKey) => metricDefinitions[metricKey])
}

export function isMetricValidForView(
  viewType: MetricViewType,
  metricKey: MetricKey,
): boolean {
  return (metricKeysByView[viewType] as readonly MetricKey[]).includes(metricKey)
}

export function getDefaultMetricForView(viewType: MetricViewType): MetricKey {
  return metricKeysByView[viewType][0]
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

function formatWholeNumber(value: number): string {
  return wholeNumberFormatter.format(Math.round(value))
}
