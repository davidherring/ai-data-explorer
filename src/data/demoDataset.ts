import { demoActivities } from '../fixtures/demoActivities.ts'
import type { Activity } from './activity.ts'

export function loadDemoActivities(): Activity[] {
  return [...demoActivities]
}
