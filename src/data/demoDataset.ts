import rawDemoActivities from '../fixtures/demoActivities.json'
import type { Activity } from './activity.ts'

const demoActivities = rawDemoActivities as Activity[]

export function loadDemoActivities(): Activity[] {
  return demoActivities.map((activity) => ({ ...activity }))
}
