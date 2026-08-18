import type { Ride } from '../data/ride.ts'
import type { MetricKey } from '../state/analysisState.ts'

export type MetricDisplay = {
  label: string
  unit: string
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

export function getMetricDisplay(metricKey: MetricKey): MetricDisplay {
  switch (metricKey) {
    case 'averageSpeedMph':
      return { label: 'Average speed', unit: 'mph' }
    case 'distanceMiles':
      return { label: 'Distance', unit: 'mi' }
    case 'elevationGainFeet':
      return { label: 'Elevation gain', unit: 'ft' }
    case 'movingTimeMinutes':
      return { label: 'Moving time', unit: 'min' }
    case 'elapsedTimeMinutes':
      return { label: 'Elapsed time', unit: 'min' }
    case 'temperatureF':
      return { label: 'Temperature', unit: 'F' }
  }
}
