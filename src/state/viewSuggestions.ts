import { z } from 'zod'
import type {
  AnalysisState,
  CumulativeMetricKey,
  MetricKey,
  ViewConfiguration,
} from './analysisState.js'
import {
  analysisStateSchema,
  cumulativeMetricKeySchema,
  dateRangeSchema,
  dayOfWeekSchema,
  metricKeySchema,
  numericRangeSchema,
  recurringDateRangeSchema,
} from './analysisStateValidation.js'

type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue }

export const viewSuggestionChangeSchema = z
  .object({
    field: z.string(),
    action: z.enum(['set', 'clear']),
    label: z.string(),
    value: z.string().optional(),
  })
  .strict()

export type ViewSuggestionChange = z.infer<typeof viewSuggestionChangeSchema>

export const viewSuggestionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    rationale: z.string().optional(),
    patch: z.lazy(() => viewSuggestionPatchSchema),
    changes: z.array(viewSuggestionChangeSchema),
  })
  .strict()

export type ViewSuggestion = z.infer<typeof viewSuggestionSchema>

const trendViewPatchSchema = z
  .object({
    type: z.literal('trend'),
    yMetric: metricKeySchema,
  })
  .strict()

const relationshipViewPatchSchema = z
  .object({
    type: z.literal('relationship'),
    xMetric: metricKeySchema,
    yMetric: metricKeySchema,
  })
  .strict()

const seasonalViewPatchSchema = z
  .object({
    type: z.literal('seasonal'),
    yMetric: metricKeySchema,
  })
  .strict()

const cumulativeViewPatchSchema = z
  .object({
    type: z.literal('cumulative'),
    yMetric: cumulativeMetricKeySchema,
  })
  .strict()

export const viewSuggestionViewPatchSchema = z.discriminatedUnion('type', [
  trendViewPatchSchema,
  relationshipViewPatchSchema,
  seasonalViewPatchSchema,
  cumulativeViewPatchSchema,
])

export const viewSuggestionSelectionPatchSchema = z
  .object({
    years: z.array(z.number()).optional(),
    daysOfWeek: z.array(dayOfWeekSchema).optional(),
    dateRange: dateRangeSchema.nullable().optional(),
    recurringDateRange: recurringDateRangeSchema.optional(),
    distanceMiles: numericRangeSchema.nullable().optional(),
    elevationGainFeet: numericRangeSchema.nullable().optional(),
    sportType: z.string().nullable().optional(),
  })
  .strict()

export const viewSuggestionPatchSchema = z
  .object({
    view: viewSuggestionViewPatchSchema.optional(),
    selection: viewSuggestionSelectionPatchSchema.optional(),
  })
  .strict()
  .refine((patch) => patch.view !== undefined || patch.selection !== undefined, {
    message: 'View suggestion patch must include a view or selection change',
  })

export const proposeViewSuggestionInputSchema = z
  .object({
    label: z.string().min(1),
    rationale: z.string().min(1).optional(),
    patch: viewSuggestionPatchSchema,
  })
  .strict()

export type ProposeViewSuggestionInput = z.infer<
  typeof proposeViewSuggestionInputSchema
>
type SuggestedSelectionPatch = NonNullable<
  ProposeViewSuggestionInput['patch']['selection']
>

export class ViewSuggestionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViewSuggestionError'
  }
}

export function buildViewSuggestion(
  sourceState: AnalysisState,
  input: ProposeViewSuggestionInput,
): ViewSuggestion {
  const source = analysisStateSchema.parse(sourceState) as AnalysisState
  const suggestionInput = proposeViewSuggestionInputSchema.parse(input)
  const proposedState = applyViewSuggestionPatch(source, suggestionInput.patch)
  const validatedProposedState = analysisStateSchema.parse(
    proposedState,
  ) as AnalysisState
  const changes = buildChanges(source, validatedProposedState, suggestionInput.patch)

  if (changes.length === 0) {
    throw new ViewSuggestionError('View suggestion patch does not change AnalysisState')
  }

  return {
    id: `suggestion-${hashCanonicalValue({
      input: suggestionInput,
      source,
    })}`,
    label: suggestionInput.label,
    ...(suggestionInput.rationale !== undefined
      ? { rationale: suggestionInput.rationale }
      : {}),
    patch: suggestionInput.patch,
    changes,
  }
}

export function getAnalysisStateFingerprint(state: AnalysisState): string {
  return `state-fnv1a:${hashCanonicalValue(analysisStateSchema.parse(state))}`
}

export function applyViewSuggestionPatch(
  currentState: AnalysisState,
  patch: ProposeViewSuggestionInput['patch'],
): AnalysisState {
  const source = analysisStateSchema.parse(currentState) as AnalysisState
  const suggestionPatch = viewSuggestionPatchSchema.parse(patch)
  const nextState = cloneAnalysisState(source)

  if (suggestionPatch.view !== undefined) {
    nextState.view = buildViewConfiguration(suggestionPatch.view)
  }

  if (suggestionPatch.selection !== undefined) {
    nextState.selection = { ...nextState.selection }

    for (const key of Object.keys(suggestionPatch.selection) as Array<
      keyof typeof suggestionPatch.selection
    >) {
      const value = suggestionPatch.selection[key]

      if (value === null) {
        delete nextState.selection[key]
      } else if (value !== undefined) {
        nextState.selection[key] = value as never
      }
    }
  }

  return analysisStateSchema.parse(nextState) as AnalysisState
}

export function applyViewSuggestion(
  currentState: AnalysisState,
  suggestion: ViewSuggestion,
): AnalysisState {
  const validatedSuggestion = viewSuggestionSchema.parse(suggestion)

  return applyViewSuggestionPatch(currentState, validatedSuggestion.patch)
}

function buildViewConfiguration(
  patch: ProposeViewSuggestionInput['patch']['view'],
): ViewConfiguration {
  if (patch === undefined) {
    throw new ViewSuggestionError('Missing view patch')
  }

  switch (patch.type) {
    case 'trend':
      return {
        type: 'trend',
        yMetric: patch.yMetric,
      }
    case 'relationship':
      return {
        type: 'relationship',
        xMetric: patch.xMetric,
        yMetric: patch.yMetric,
      }
    case 'seasonal':
      return {
        type: 'seasonal',
        yMetric: patch.yMetric,
        aggregation: 'biweekly-median',
      }
    case 'cumulative':
      return {
        type: 'cumulative',
        yMetric: patch.yMetric,
        accumulation: 'continuous',
      }
  }
}

function buildChanges(
  sourceState: AnalysisState,
  proposedState: AnalysisState,
  patch: ProposeViewSuggestionInput['patch'],
): ViewSuggestionChange[] {
  const changes: ViewSuggestionChange[] = []

  if (patch.view !== undefined) {
    addChangeIfDifferent(changes, {
      field: 'view.type',
      label: 'View',
      sourceValue: sourceState.view.type,
      proposedValue: proposedState.view.type,
      value: formatViewType(proposedState.view.type),
    })

    addMetricChanges(changes, sourceState.view, proposedState.view)
  }

  if (patch.selection !== undefined) {
    for (const key of Object.keys(patch.selection) as Array<
      keyof typeof patch.selection
    >) {
      addChangeIfDifferent(changes, {
        field: `selection.${key}`,
        label: selectionFieldLabels[key],
        sourceValue: sourceState.selection[key],
        proposedValue: proposedState.selection[key],
        value:
          proposedState.selection[key] === undefined
            ? undefined
            : formatSelectionValue(key, proposedState.selection[key]),
      })
    }
  }

  return changes
}

function addMetricChanges(
  changes: ViewSuggestionChange[],
  sourceView: ViewConfiguration,
  proposedView: ViewConfiguration,
): void {
  if ('xMetric' in proposedView) {
    addChangeIfDifferent(changes, {
      field: 'view.xMetric',
      label: 'X metric',
      sourceValue: 'xMetric' in sourceView ? sourceView.xMetric : undefined,
      proposedValue: proposedView.xMetric,
      value: formatMetric(proposedView.xMetric),
    })
  }

  if ('yMetric' in proposedView) {
    addChangeIfDifferent(changes, {
      field: 'view.yMetric',
      label: 'Metric',
      sourceValue: 'yMetric' in sourceView ? sourceView.yMetric : undefined,
      proposedValue: proposedView.yMetric,
      value: formatMetric(proposedView.yMetric),
    })
  }
}

function addChangeIfDifferent(
  changes: ViewSuggestionChange[],
  options: {
    field: string
    label: string
    sourceValue: unknown
    proposedValue: unknown
    value: string | undefined
  },
): void {
  if (canonicalStringify(options.sourceValue) === canonicalStringify(options.proposedValue)) {
    return
  }

  if (options.proposedValue === undefined) {
    changes.push({
      field: options.field,
      action: 'clear',
      label: options.label,
    })
    return
  }

  changes.push({
    field: options.field,
    action: 'set',
    label: options.label,
    ...(options.value !== undefined ? { value: options.value } : {}),
  })
}

function cloneAnalysisState(state: AnalysisState): AnalysisState {
  return JSON.parse(JSON.stringify(state)) as AnalysisState
}

function hashCanonicalValue(value: unknown): string {
  return hashString(canonicalStringify(value))
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(toCanonicalValue(value))
}

function toCanonicalValue(value: unknown): CanonicalValue | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const canonicalItem = toCanonicalValue(item)

      return canonicalItem === undefined ? null : canonicalItem
    })
  }

  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    const canonicalObject: { [key: string]: CanonicalValue } = {}

    for (const key of Object.keys(object).sort()) {
      const canonicalValue = toCanonicalValue(object[key])

      if (canonicalValue !== undefined) {
        canonicalObject[key] = canonicalValue
      }
    }

    return canonicalObject
  }

  return String(value)
}

function hashString(value: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

const metricLabels = {
  averageSpeedMph: 'Average speed',
  distanceMiles: 'Distance',
  elevationGainFeet: 'Elevation gain',
  movingTimeMinutes: 'Moving time',
} as const satisfies Record<MetricKey, string>

const selectionFieldLabels = {
  years: 'Years',
  daysOfWeek: 'Days of week',
  dateRange: 'Date range',
  recurringDateRange: 'Seasonal window',
  distanceMiles: 'Distance',
  elevationGainFeet: 'Elevation',
  sportType: 'Sport type',
} as const satisfies Record<keyof SuggestedSelectionPatch, string>

function formatMetric(metric: MetricKey | CumulativeMetricKey): string {
  return metricLabels[metric]
}

function formatViewType(viewType: ViewConfiguration['type']): string {
  switch (viewType) {
    case 'trend':
      return 'Trend'
    case 'relationship':
      return 'Relationship'
    case 'seasonal':
      return 'Seasonal'
    case 'cumulative':
      return 'Cumulative'
  }
}

function formatSelectionValue(
  key: keyof SuggestedSelectionPatch,
  value: unknown,
): string {
  switch (key) {
    case 'years':
      return Array.isArray(value) ? value.join(', ') : ''
    case 'daysOfWeek':
      return Array.isArray(value)
        ? value.map((day) => formatDayOfWeek(String(day))).join(', ')
        : ''
    case 'dateRange':
      return formatDateRange(value)
    case 'recurringDateRange':
      return formatRecurringDateRange(value)
    case 'distanceMiles':
      return formatNumericRange(value, 'mi')
    case 'elevationGainFeet':
      return formatNumericRange(value, 'ft')
    case 'sportType':
      return String(value)
  }

  throw new ViewSuggestionError(`Unsupported selection field: ${String(key)}`)
}

function formatDayOfWeek(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}

function formatDateRange(value: unknown): string {
  const range = value as { start?: string; end?: string }

  return `${range.start ?? 'Any start'}-${range.end ?? 'Any end'}`
}

function formatRecurringDateRange(value: unknown): string {
  const range = value as {
    start: { month: number; day: number }
    end: { month: number; day: number }
  }

  return `${formatMonthDay(range.start)}-${formatMonthDay(range.end)}`
}

function formatMonthDay(monthDay: { month: number; day: number }): string {
  return `${monthDay.month.toString().padStart(2, '0')}-${monthDay.day
    .toString()
    .padStart(2, '0')}`
}

function formatNumericRange(value: unknown, unit: string): string {
  const range = value as { min?: number; max?: number }

  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}-${range.max} ${unit}`
  }

  if (range.min !== undefined) {
    return `At least ${range.min} ${unit}`
  }

  if (range.max !== undefined) {
    return `At most ${range.max} ${unit}`
  }

  return `Any ${unit}`
}
