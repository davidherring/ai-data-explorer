# Sprint 05 - Metric-Configurable Trend and Relationship Views

## Sprint Goal

Make the existing Trend and Relationship views metric-configurable through shared typed `AnalysisState` so the visible analysis is fully represented by state.

This sprint turns the current hard-coded Trend and Relationship experiments into a more flexible manual exploration workspace before AI tools or View Suggestions are added.

The sprint remains limited to:

- Trend metric flexibility;
- Relationship x/y metric flexibility;
- a small metric metadata source of truth;
- focused UI controls for selecting metrics;
- deterministic finite-value handling.

Do not implement AI behavior, AI tool wrappers, View Suggestions, seasonal views, cumulative views, comparison mode, persistence, or saved analyses in this sprint.

Approved Sprint 5 decisions:

- Keep Sprint 5 limited to Trend and Relationship metric flexibility.
- No AI/tool layer yet.
- Hide `temperatureF` from metric selectors when the active source dataset contains no finite temperature values.
- Allow `xMetric === yMetric`.
- Do not silently substitute metrics.
- Use one small typed metric metadata source of truth.
- Do not add seasonal or cumulative views in this sprint.

## 1. Metric Metadata Foundation

Objective: Replace hard-coded labels, units, and formatting with a small explicit metadata model for the current `MetricKey` values and current view needs.

Final `MetricDefinition` shape:

```ts
type MetricDefinition = {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  role: {
    trendY: boolean
    relationshipX: boolean
    relationshipY: boolean
  }
  optional?: boolean
  format: (value: number) => string
}
```

Supported metric roles:

| Metric | Trend Y | Relationship X | Relationship Y | Optional |
| --- | --- | --- | --- | --- |
| `averageSpeedMph` | yes | yes | yes | no |
| `distanceMiles` | yes | yes | yes | no |
| `elevationGainFeet` | yes | yes | yes | no |
| `movingTimeMinutes` | yes | yes | yes | no |
| `elapsedTimeMinutes` | yes | yes | yes | no |
| `temperatureF` | yes, only when finite source data exists | yes, only when finite source data exists | yes, only when finite source data exists | yes |

Deliverables:

- Add bounded metric definitions in `src/analysis/rideMetrics.ts`.
- Keep `getRideMetric(ride, metricKey)` as the typed value accessor.
- Add `getMetricDefinition(metricKey)`.
- Preserve `getMetricDisplay(metricKey)` if it remains useful for existing callers.
- Add `hasFiniteMetricValue(rides, metricKey)`.
- Add a small role-filtered metric option helper if it reduces duplication in controls.
- Use metric metadata for display labels, short labels, units, and numeric formatting.

Verification / exit criteria:

- Tests cover metadata for every current `MetricKey`.
- Tests cover role filtering.
- Tests cover temperature availability.
- Tests cover numeric formatting.
- No generalized visualization schema or registry framework is introduced.

## 2. AnalysisState View Strategy

Objective: Make Trend and Relationship view configuration explicit enough that `AnalysisState.view` can reproduce the visible chart.

Preferred state shapes:

```ts
type TrendViewConfiguration = {
  type: 'trend'
  yMetric: MetricKey
}

type RelationshipViewConfiguration = {
  type: 'relationship'
  xMetric: MetricKey
  yMetric: MetricKey
}
```

Defaults:

```ts
{
  type: 'trend',
  yMetric: 'averageSpeedMph',
}
```

```ts
{
  type: 'relationship',
  xMetric: 'elevationGainFeet',
  yMetric: 'averageSpeedMph',
}
```

Per-view metric memory decision:

Use explicit defaults when switching views in Sprint 5 unless preserving the prior metrics for each view can be implemented with a tiny local helper and no second state model.

Rationale:

- The project requirement is that the current visible analysis is represented by `AnalysisState.view`.
- Adding a separate persistent per-view cache would create another state model before the AI path exists.
- Defaulting is simple, deterministic, and consistent with Sprint 4 behavior.
- If implementation can preserve prior view metrics by reading the existing `current.view` during a same-type update, do that locally; otherwise defer richer per-view memory.

Deliverables:

- Tighten `ViewConfiguration` into discriminated Trend and Relationship shapes if it can be done without broad churn.
- Keep future `seasonal` and `cumulative` identifiers only where needed for existing contracts, not as implemented views.
- Ensure Trend and Relationship metric controls update `AnalysisState.view`.
- Ensure switching views does not change `AnalysisState.selection`.
- Do not silently replace invalid or unavailable metrics.

Verification / exit criteria:

- Tests cover default Trend and Relationship configurations.
- Tests cover metric updates in `AnalysisState.view`.
- Tests cover switching views while preserving selection.
- Tests cover the chosen default or minimal memory behavior.

## 3. Metric Controls

Objective: Add compact, understandable metric controls near the visualization header, separate from activity filters.

Trend UX:

```text
Metric [Average speed]
```

Relationship UX:

```text
X [Elevation gain]
Y [Average speed]
```

Deliverables:

- Use native `select` controls.
- Keep Trend / Relationship switching separate from metric selection.
- Render metric controls next to the visualization, not inside `ActivitySelectionControls`.
- Source options from metric metadata and role helpers.
- Omit `Temperature` from selectors when the active source `Ride[]` has no finite `temperatureF` values.
- Show `Temperature` normally when finite source temperature values exist.
- Do not show disabled unavailable temperature options.

Verification / exit criteria:

- Trend metric selector updates `AnalysisState.view.yMetric`.
- Relationship X selector updates `AnalysisState.view.xMetric`.
- Relationship Y selector updates `AnalysisState.view.yMetric`.
- Metric option availability responds to the active source dataset.
- Existing activity filters remain visually and behaviorally separate.

## 4. Trend Generalization

Objective: Generalize the existing average-speed trend into a metric-driven chart while preserving Sprint 3 visualization semantics.

Architecture:

- Prefer renaming/refactoring `AverageSpeedTrendChart` to `MetricTrendChart` if clean.
- Accept `yMetric` as a required prop.
- Build plotted points from selected rides with finite values for `yMetric`.
- Use `getRideMetric()` for values.
- Use metric metadata for title, y-axis label, tooltip text, value formatting, and accessibility text.
- Keep x as athlete-local calendar date from `ride.localDate`.

Behavior:

- Title: `<Metric label> over calendar time`.
- X-axis remains ride date.
- Y-axis label uses metric label and unit.
- Native tooltip includes:
  - local date;
  - active metric value;
  - distance;
  - elevation;
  - sport type.
- Zero selected rides keeps the normal empty-selection behavior.
- Selected rides with zero finite values for the active metric shows a metric-specific empty state.
- Plot only finite metric values.
- Do not add a line, smoothing, rolling average, or aggregation.

Verification / exit criteria:

- Non-speed Trend metric changes chart title/accessibility text.
- Non-speed Trend metric appears in tooltip text with correct formatting.
- Missing optional metric values are not plotted.
- Zero valid optional metric values render a clear metric-specific empty state.
- Existing speed trend behavior remains intact through metadata-driven rendering.

## 5. Relationship Generalization

Objective: Make Relationship view fully driven by `AnalysisState.view.xMetric` and `AnalysisState.view.yMetric`.

Architecture:

- In `AnalysisWorkspaceShell`, derive active relationship metrics from `analysisState.view`.
- Call `relationshipBetweenMetrics(selectedRides, xMetric, yMetric)`.
- Call `getMetricRelationshipPoints(selectedRides, xMetric, yMetric)`.
- Pass active metrics and metadata-driven results into `RelationshipScatterChart` and `RelationshipStatus`.

Behavior:

- Chart title: `<X metric label> vs <Y metric label>`.
- Axis labels derive from metric metadata.
- Native tooltip includes:
  - local date;
  - active x metric value;
  - active y metric value;
  - distance;
  - elevation;
  - sport type.
- Accessibility text derives from active metric labels.
- `RelationshipStatus` uses active metric labels in zero-variance messages.
- `validPairCount` continues to reflect only finite x/y pairs.
- `xMetric === yMetric` remains valid and may yield `Pearson r = 1.00` when variance exists.

Verification / exit criteria:

- Relationship chart consumes the active metric pair from `AnalysisState.view`.
- Non-default metric pair changes title, axes, tooltip, and status.
- Missing optional metric values are excluded from valid pairs and plotted points.
- Zero-variance messages use active x/y metric labels.
- No hard-coded elevation/speed wording remains except in explicit default configuration and tests for that default.

## 6. Optional and Missing Data Behavior

Objective: Establish predictable finite-value handling for required and optional metrics without substituting values.

Rules:

- Plot and analyze only finite values for active metrics.
- Do not convert missing, `NaN`, `Infinity`, or `-Infinity` values to zero.
- Do not silently substitute another metric.
- For Trend:
  - zero selected rides shows the existing no-rides empty state;
  - selected rides with zero finite active metric values shows a metric-specific empty state.
- For Relationship:
  - zero selected rides shows the existing no-rides empty state;
  - selected rides with zero finite x/y pairs shows a metric-specific invalid-pair state;
  - fewer than 3 valid pairs keeps `insufficient-valid-pairs`;
  - zero x variance and zero y variance keep deterministic status semantics.
- Same-metric pairs are valid.

Verification / exit criteria:

- Tests cover optional metric absence in Trend and Relationship.
- Tests cover no silent substitution.
- Tests cover finite-value filtering.
- Tests cover same-metric relationship behavior remains valid.

## 7. Integration Tests and Styling

Objective: Preserve existing filtering and data-source behavior while adding metric configurability coverage.

Deliverables:

- Component tests for metric controls.
- Component tests for `MetricTrendChart`.
- Component tests for `RelationshipScatterChart`.
- Component tests for `RelationshipStatus`.
- App/workspace tests for:
  - Trend metric selection;
  - Relationship x/y metric selection;
  - view switching preserving selection;
  - chosen default or minimal memory behavior across view switching.
- CSS updates scoped to metric controls and existing chart header layout.

Do not over-test Observable Plot internals. It is sufficient to test user-visible labels, tooltip text emitted into Plot output, empty states, and SVG mounting where current tests already do so.

Verification / exit criteria:

- Existing filtering and data-source tests remain green.
- Current demo mode still works without Strava credentials.
- Workspace remains usable at current responsive breakpoints.
- Metric controls do not substantially redesign the workspace.

## 8. Final Verification

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Exit criteria:

- All required verification commands pass.
- No live Strava API calls, model calls, or credentials are required by normal tests.
- Demo mode remains usable without Strava credentials.
- Live Strava mode still uses normalized rides through the existing data-source boundary.
- No unrelated files are modified.

## Out of Scope

- AI SDK/model calls.
- AI tool wrappers.
- Conversation behavior changes.
- View Suggestions.
- Seasonal view.
- Cumulative view.
- Comparison mode.
- Calendar aggregation.
- Rolling averages or smoothing.
- Persistence.
- Saved analyses.
- Weather enrichment.
- Regression lines.
- P-values or statistical significance testing.
- Causal claims.

## Remaining Ambiguity

No product ambiguity currently requires approval.

The only implementation judgment left is whether the component rename from `AverageSpeedTrendChart` to `MetricTrendChart` is clean enough to include. Prefer the rename if it is low-churn; otherwise keep the existing file temporarily and still make the chart metric-driven.
