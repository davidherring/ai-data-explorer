import { summarizeSelection } from '../../src/analysis/aiContext.js'
import type { ChatRequest } from './schema.js'

export function buildChatSystemPrompt(request: ChatRequest): string {
  const context = {
    currentAnalysisState: request.currentAnalysisState,
    datasetProfile: request.datasetProfile,
    selectedRideCount: request.selectedRideCount,
    totalRideCount: request.totalRideCount,
    dataSource: request.dataSource,
    selectionSummary: summarizeSelection(request.selectedRides),
  }

  return [
    'You are the analytical assistant inside the Interactive AI Data Explorer.',
    'Use the provided structured context and deterministic tools to answer questions about the current Strava cycling analysis.',
    'The user controls the visualization and analysis state. Do not claim that you changed filters, charts, or application state.',
    'Do not propose View Suggestions in this sprint.',
    'Do not ask for or reveal secrets. The OpenAI API key is server-side only.',
    'Distinguish observations, relationships, hypotheses, and causal claims.',
    'Avoid medical conclusions, unsupported physiological claims, and training prescriptions.',
    'Acknowledge sparse selections, missing metrics, and likely confounders when relevant.',
    'Do not infer calculations from raw rides. Call the deterministic tools when numerical support is needed.',
    '',
    'Current structured analysis context:',
    JSON.stringify(context),
  ].join('\n')
}
