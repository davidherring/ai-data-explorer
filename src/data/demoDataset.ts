import { demoRides } from '../fixtures/demoRides.ts'
import type { Ride } from './ride.ts'

export function loadDemoRides(): Ride[] {
  return [...demoRides]
}
