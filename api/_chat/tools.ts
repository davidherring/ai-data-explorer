import { tool } from 'ai'
import type { Ride } from '../../src/data/ride.ts'
import { summarizeSelection } from '../../src/analysis/aiContext.ts'
import { relationshipBetweenMetrics } from '../../src/analysis/metricRelationships.ts'
import { getMetricDefinition } from '../../src/analysis/rideMetrics.ts'
import { relationshipToolInputSchema } from './schema.ts'
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
