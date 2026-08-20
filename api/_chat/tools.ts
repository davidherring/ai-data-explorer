import { tool } from 'ai'
import type { Ride } from '../../src/data/ride.js'
import { summarizeSelection } from '../../src/analysis/aiContext.js'
import { buildGroupedComparison } from '../../src/analysis/groupComparisons.js'
import { relationshipBetweenMetrics } from '../../src/analysis/metricRelationships.js'
import { calculateMetricTrend } from '../../src/analysis/metricTrends.js'
import { getMetricDefinition } from '../../src/analysis/rideMetrics.js'
import {
  calculateTrendToolInputSchema,
  compareGroupsToolInputSchema,
  relationshipToolInputSchema,
} from './schema.js'
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
    compareGroups: tool({
      description:
        'Compare groups within the currently selected rides using deterministic metric summaries, composition counts, warnings, and pairwise deltas.',
      inputSchema: compareGroupsToolInputSchema,
      execute: async (input) => buildGroupedComparison(selectedRides, input),
    }),
    calculateTrend: tool({
      description:
        'Calculate deterministic ride-level trend evidence for one metric over calendar time within the currently selected rides.',
      inputSchema: calculateTrendToolInputSchema,
      execute: async ({ metric }) => calculateMetricTrend(selectedRides, metric),
    }),
  }
}
