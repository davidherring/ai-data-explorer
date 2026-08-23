import { tool } from 'ai'
import type { Activity } from '../../src/data/activity.js'
import { summarizeSelection } from '../../src/analysis/aiContext.js'
import { buildGroupedComparison } from '../../src/analysis/groupComparisons.js'
import { relationshipBetweenMetrics } from '../../src/analysis/metricRelationships.js'
import { calculateMetricTrend } from '../../src/analysis/metricTrends.js'
import { getMetricDefinition } from '../../src/analysis/activityMetrics.js'
import type { AnalysisState } from '../../src/state/analysisState.js'
import {
  buildViewSuggestion,
  proposeViewSuggestionInputSchema,
} from '../../src/state/viewSuggestions.js'
import {
  calculateTrendToolInputSchema,
  compareGroupsToolInputSchema,
  relationshipToolInputSchema,
} from './schema.js'
import { z } from 'zod'

export function createAnalysisTools(
  selectedActivities: readonly Activity[],
  currentAnalysisState: AnalysisState,
) {
  return {
    summarizeSelection: tool({
      description:
        'Summarize the currently selected activities with deterministic counts, metric summaries, and data-quality warnings.',
      inputSchema: z.object({}).strict(),
      execute: async () => summarizeSelection(selectedActivities),
    }),
    relationshipBetweenMetrics: tool({
      description:
        'Calculate the deterministic Pearson relationship between two metrics for the currently selected activities.',
      inputSchema: relationshipToolInputSchema,
      execute: async ({ xMetric, yMetric }) => {
        const result = relationshipBetweenMetrics(selectedActivities, xMetric, yMetric)
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
        'Compare groups within the currently selected activities using deterministic metric summaries, composition counts, warnings, and pairwise deltas.',
      inputSchema: compareGroupsToolInputSchema,
      execute: async (input) => buildGroupedComparison(selectedActivities, input),
    }),
    calculateTrend: tool({
      description:
        'Calculate deterministic activity-level trend evidence for one metric over calendar time within the currently selected activities.',
      inputSchema: calculateTrendToolInputSchema,
      execute: async ({ metric }) => calculateMetricTrend(selectedActivities, metric),
    }),
    proposeViewSuggestion: tool({
      description:
        'Propose a validated, user-controlled view or filter change by applying a constrained patch to the current analysis state. Use only when changing the view or filters would materially help the analysis.',
      inputSchema: proposeViewSuggestionInputSchema,
      execute: async (input) => buildViewSuggestion(currentAnalysisState, input),
    }),
  }
}
