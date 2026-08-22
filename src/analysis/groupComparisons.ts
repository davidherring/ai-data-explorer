import type { DayOfWeek, Activity } from '../data/activity.js'
import type { DayMode, GroupingKey, MetricKey } from '../state/analysisState.js'
import {
  summarizeSelection,
  type SelectionMetricSummary,
  type SelectionSummaryWarning,
} from './aiContext.js'

export type GroupComparisonGroupBy = GroupingKey

export type GroupComparisonDayMode = Exclude<DayMode, 'all'>

export type GroupComparisonGroupValue =
  | number
  | DayOfWeek
  | GroupComparisonDayMode

export type GroupedComparisonOptions = {
  groupBy: GroupComparisonGroupBy
  groups?: readonly GroupComparisonGroupValue[]
}

export type GroupedComparison = {
  groupBy: GroupComparisonGroupBy
  sampleCount: number
  groups: GroupComparisonGroup[]
  pairwiseDeltas?: PairwiseGroupComparison
}

export type GroupComparisonGroup = {
  groupValue: GroupComparisonGroupValue
  label: string
  status: GroupComparisonGroupStatus
  activityCount: number
  dateRange?: {
    start?: string
    end?: string
  }
  metrics: SelectionMetricSummary[]
  warnings: GroupComparisonWarning[]
  composition: {
    sportTypes: GroupCompositionCount[]
  }
}

export type GroupComparisonGroupStatus = 'present' | 'missing-requested-group'

export type GroupComparisonWarning =
  | SelectionSummaryWarning
  | {
      code: 'missing-requested-group'
      groupValue: GroupComparisonGroupValue
    }

export type GroupCompositionCount = {
  value: string
  count: number
}

export type PairwiseGroupComparison = {
  baselineGroupValue: GroupComparisonGroupValue
  comparisonGroupValue: GroupComparisonGroupValue
  metrics: GroupComparisonMetricDelta[]
}

export type GroupComparisonMetricDelta = {
  metric: MetricKey
  label: string
  unit: string
  mean?: GroupComparisonDelta
  median?: GroupComparisonDelta
  total?: GroupComparisonDelta
}

export type GroupComparisonDelta = {
  baselineValue: number
  comparisonValue: number
  absoluteDifference: number
  percentDifference?: number
}

const additiveMetricKeys = new Set<MetricKey>([
  'distanceMiles',
  'elevationGainFeet',
  'movingTimeMinutes',
])

const dayOfWeekSortOrder: readonly DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const dayModeSortOrder: readonly GroupComparisonDayMode[] = [
  'weekday',
  'weekend',
]

export function buildGroupedComparison(
  activities: readonly Activity[],
  options: GroupedComparisonOptions,
): GroupedComparison {
  const groupedRides = groupRides(activities, options.groupBy)
  const groupValues = getOutputGroupValues(groupedRides, options)
  const groups = groupValues.map((groupValue) =>
    buildComparisonGroup(groupValue, groupedRides.get(getGroupMapKey(groupValue))),
  )
  const pairwiseDeltas =
    groups.length === 2 ? buildPairwiseDeltas(groups[0], groups[1]) : undefined

  return {
    groupBy: options.groupBy,
    sampleCount: activities.length,
    groups,
    ...(pairwiseDeltas !== undefined ? { pairwiseDeltas } : {}),
  }
}

function groupRides(
  activities: readonly Activity[],
  groupBy: GroupComparisonGroupBy,
): Map<string, Activity[]> {
  const groupedRides = new Map<string, Activity[]>()

  for (const activity of activities) {
    const groupValue = getRideGroupValue(activity, groupBy)
    const groupKey = getGroupMapKey(groupValue)
    const group = groupedRides.get(groupKey)

    if (group) {
      group.push(activity)
    } else {
      groupedRides.set(groupKey, [activity])
    }
  }

  return groupedRides
}

function getOutputGroupValues(
  groupedRides: ReadonlyMap<string, readonly Activity[]>,
  options: GroupedComparisonOptions,
): GroupComparisonGroupValue[] {
  if (options.groups !== undefined) {
    return getUniqueRequestedGroups(options.groups)
  }

  const discoveredValues: GroupComparisonGroupValue[] = []

  for (const activities of groupedRides.values()) {
    const firstRide = activities[0]

    if (firstRide !== undefined) {
      discoveredValues.push(getRideGroupValue(firstRide, options.groupBy))
    }
  }

  return discoveredValues.sort((left, right) =>
    compareGroupValues(left, right, options.groupBy),
  )
}

function getUniqueRequestedGroups(
  requestedGroups: readonly GroupComparisonGroupValue[],
): GroupComparisonGroupValue[] {
  const seenKeys = new Set<string>()
  const groups: GroupComparisonGroupValue[] = []

  for (const groupValue of requestedGroups) {
    const groupKey = getGroupMapKey(groupValue)

    if (!seenKeys.has(groupKey)) {
      seenKeys.add(groupKey)
      groups.push(groupValue)
    }
  }

  return groups
}

function buildComparisonGroup(
  groupValue: GroupComparisonGroupValue,
  activities: readonly Activity[] | undefined,
): GroupComparisonGroup {
  const groupRides = activities ?? []
  const summary = summarizeSelection(groupRides)
  const missing = activities === undefined

  return {
    groupValue,
    label: String(groupValue),
    status: missing ? 'missing-requested-group' : 'present',
    activityCount: summary.activityCount,
    ...(summary.dateRange !== undefined ? { dateRange: summary.dateRange } : {}),
    metrics: summary.metrics,
    warnings: [
      ...(missing ? [{ code: 'missing-requested-group', groupValue } as const] : []),
      ...summary.warnings,
    ],
    composition: {
      sportTypes: buildSportTypeComposition(groupRides),
    },
  }
}

function buildSportTypeComposition(
  activities: readonly Activity[],
): GroupCompositionCount[] {
  const countsBySportType = new Map<string, number>()

  for (const activity of activities) {
    countsBySportType.set(
      activity.sportType,
      (countsBySportType.get(activity.sportType) ?? 0) + 1,
    )
  }

  return Array.from(countsBySportType, ([value, count]) => ({ value, count })).sort(
    (left, right) => left.value.localeCompare(right.value),
  )
}

function buildPairwiseDeltas(
  baselineGroup: GroupComparisonGroup,
  comparisonGroup: GroupComparisonGroup,
): PairwiseGroupComparison {
  return {
    baselineGroupValue: baselineGroup.groupValue,
    comparisonGroupValue: comparisonGroup.groupValue,
    metrics: baselineGroup.metrics.map((baselineMetric) =>
      buildMetricDelta(
        baselineMetric,
        getMetricSummary(comparisonGroup.metrics, baselineMetric.metric),
      ),
    ),
  }
}

function buildMetricDelta(
  baselineMetric: SelectionMetricSummary,
  comparisonMetric: SelectionMetricSummary | undefined,
): GroupComparisonMetricDelta {
  return {
    metric: baselineMetric.metric,
    label: baselineMetric.label,
    unit: baselineMetric.unit,
    ...buildOptionalDelta('mean', baselineMetric, comparisonMetric),
    ...buildOptionalDelta('median', baselineMetric, comparisonMetric),
    ...(additiveMetricKeys.has(baselineMetric.metric)
      ? buildOptionalDelta('total', baselineMetric, comparisonMetric)
      : {}),
  }
}

function buildOptionalDelta(
  field: 'mean' | 'median' | 'total',
  baselineMetric: SelectionMetricSummary,
  comparisonMetric: SelectionMetricSummary | undefined,
): Partial<Record<typeof field, GroupComparisonDelta>> {
  const baselineValue = baselineMetric[field]
  const comparisonValue = comparisonMetric?.[field]

  if (!isFiniteNumber(baselineValue) || !isFiniteNumber(comparisonValue)) {
    return {}
  }

  const absoluteDifference = comparisonValue - baselineValue

  return {
    [field]: {
      baselineValue,
      comparisonValue,
      absoluteDifference,
      ...(baselineValue !== 0
        ? { percentDifference: absoluteDifference / baselineValue }
        : {}),
    },
  } as Partial<Record<typeof field, GroupComparisonDelta>>
}

function getMetricSummary(
  metrics: readonly SelectionMetricSummary[],
  metric: MetricKey,
): SelectionMetricSummary | undefined {
  return metrics.find((summary) => summary.metric === metric)
}

function getRideGroupValue(
  activity: Activity,
  groupBy: GroupComparisonGroupBy,
): GroupComparisonGroupValue {
  switch (groupBy) {
    case 'year':
      return activity.year
    case 'month':
      return activity.month
    case 'dayOfWeek':
      return activity.dayOfWeek
    case 'dayMode':
      return activity.isWeekend ? 'weekend' : 'weekday'
  }
}

function getGroupMapKey(groupValue: GroupComparisonGroupValue): string {
  return String(groupValue)
}

function compareGroupValues(
  left: GroupComparisonGroupValue,
  right: GroupComparisonGroupValue,
  groupBy: GroupComparisonGroupBy,
): number {
  switch (groupBy) {
    case 'year':
    case 'month':
      return Number(left) - Number(right)
    case 'dayOfWeek':
      return dayOfWeekSortOrder.indexOf(left as DayOfWeek) -
        dayOfWeekSortOrder.indexOf(right as DayOfWeek)
    case 'dayMode':
      return dayModeSortOrder.indexOf(left as GroupComparisonDayMode) -
        dayModeSortOrder.indexOf(right as GroupComparisonDayMode)
  }
}

function isFiniteNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value)
}
