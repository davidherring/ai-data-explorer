import { tool } from 'ai'
import type { Ride } from '../../src/data/ride.js'
import { summarizeSelection } from '../../src/analysis/aiContext.js'
import { relationshipBetweenMetrics } from '../../src/analysis/metricRelationships.js'
import { getMetricDefinition } from '../../src/analysis/rideMetrics.js'
import { relationshipToolInputSchema } from './schema.js'
import { z } from 'zod'

export function createAnalysisTools(selectedRides: readonly Ride[]) {
  return {
    summarizeSelection: tool({
      description:
        'Summarize the currently selected rides with deterministic counts, metric summaries, and data-quality warnings.',
      inputSchema: z.object({}).strict(),
      execute: async () => summarizeSelection(selectedRides),
    }),
    relationshipBetweenMetrics: tool({
      description:
        'Calculate the deterministic Pearson relationship between two metrics for the currently selected rides.',
      inputSchema: relationshipToolInputSchema,
      execute: async ({ xMetric, yMetric }) => {
        const result = relationshipBetweenMetrics(selectedRides, xMetric, yMetric)
        const xDefinition = getMetricDefinition(xMetric)
        const yDefinition = getMetricDefinition(yMetric)

        return {
          ...result,
          xLabel: xDefinition.label,
          xUnit: xDefinition.unit,
          yLabel: yDefinition.label,
          yUnit: yDefinition.unit,
        }
      },
    }),
  }
}
