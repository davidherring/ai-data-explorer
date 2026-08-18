# Sprint 04 - Relationship View and Deterministic Metric Analysis

## Sprint Goal

Add a state-driven relationship/scatter view for the current selected `Ride[]` and establish a small deterministic metric-relationship analysis layer that later AI tools can reuse.

The initial relationship view is fixed:

- x = `elevationGainFeet`
- y = `averageSpeedMph`

The sprint should preserve the existing selection-first model:

- filtering remains driven by `AnalysisState.selection`;
- the same `selectedRides` feeds either chart;
- chart views consume selected rides and deterministic analytical outputs;
- switching views must not change the current activity selection.

Do not implement AI behavior, AI tool wrappers, comparison mode, seasonal/cumulative views, configurable metric pickers, regression lines, smoothing, aggregation, persistence, or saved analyses in this sprint.

Approved Sprint 4 decisions:

- Use existing `AnalysisState.view` for view switching.
- Relationship view state is:

```ts
{
  type: 'relationship',
  xMetric: 'elevationGainFeet',
  yMetric: 'averageSpeedMph',
}
```

- Trend view state remains:

```ts
{
  type: 'trend',
  yMetric: 'averageSpeedMph',
}
```

- Add `relationshipBetweenMetrics()` as a deterministic analysis function.
- Add a small typed metric accessor such as `getRideMetric(ride, metricKey)` if it keeps relationship analysis generic and typed.
- Pearson correlation is included when statistically valid.
- Missing, undefined, `NaN`, or otherwise non-finite metric values are excluded from valid pairs, not converted to zero.
- Do not calculate p-values.
- Do not add statistical-significance language.
- Do not make causal claims.
- Do not add a regression line.
- Do not display false precision.

## 1. Metric Access and Deterministic Relationship Analysis

Objective: Create a small reusable analysis foundation for metric relationships without putting numerical logic inside visualization components.

Deliverables:

- Small typed metric accessor for numeric ride metrics, if useful:
  - `getRideMetric(ride, metricKey)`.
- Explicit metric labels and units needed by Sprint 4:
  - `elevationGainFeet` → elevation gain, ft;
  - `averageSpeedMph` → average speed, mph.
- Pure `relationshipBetweenMetrics(...)` function in `src/analysis/`.
- Structured result type suitable for later AI tool reuse.

Result shape should include:

```ts
type MetricRelationshipStatus =
  | 'ready'
  | 'insufficient-valid-pairs'
  | 'zero-x-variance'
  | 'zero-y-variance';

type MetricRelationshipResult = {
  xMetric: MetricKey;
  yMetric: MetricKey;
  sampleCount: number;
  validPairCount: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  pearsonR?: number;
  status: MetricRelationshipStatus;
};
```

Pearson rules:

- `sampleCount` is the number of rides supplied.
- `validPairCount` is the number of rides with finite values for both requested metrics.
- Exclude invalid pairs from ranges and correlation.
- Calculate Pearson r only when there are at least 3 valid pairs.
- Require non-zero variance in both metrics.
- Return a structured unavailable status when Pearson r cannot be calculated.
- Do not calculate p-values or statistical significance.
- Do not infer causation.

Verification / exit criteria:

- Unit tests cover normal positive and negative correlations.
- Unit tests cover empty input.
- Unit tests cover fewer than 3 valid pairs.
- Unit tests cover missing optional metric values.
- Unit tests cover `NaN` and non-finite values.
- Unit tests cover zero x variance and zero y variance.
- Function does not mutate input rides.

## 2. AnalysisState View Switching

Objective: Allow the user to switch between the existing trend view and the new relationship view through shared analysis state.

Deliverables:

- Compact Trend / Relationship control near the visualization header.
- Switching to Trend sets:

```ts
{
  type: 'trend',
  yMetric: 'averageSpeedMph',
}
```

- Switching to Relationship sets:

```ts
{
  type: 'relationship',
  xMetric: 'elevationGainFeet',
  yMetric: 'averageSpeedMph',
}
```

- Current `ActivitySelection` remains unchanged during view switching.
- No configurable x/y metric picker is added.
- No `AnalysisState` type changes unless implementation reveals a genuine blocker.

Verification / exit criteria:

- View control updates `AnalysisState.view`.
- Selection controls continue to update only `AnalysisState.selection`.
- Selected ride count and filters are preserved across view changes.
- Status strip or equivalent visible state reflects the active view.

## 3. Relationship Scatter Visualization

Objective: Add the first relationship/scatter chart using Observable Plot and the existing responsive chart pattern.

Deliverables:

- Separate `RelationshipScatterChart` component.
- One point per valid selected ride.
- x-axis: elevation gain in feet.
- y-axis: average speed in mph.
- Native tooltip/title includes:
  - local date;
  - average speed;
  - distance;
  - elevation;
  - sport type.
- Preserve athlete-local `localDate` text in tooltips.
- Responsive width behavior aligned with the current trend chart.
- Empty state when no rides are selected.
- Clear sparse/invalid valid-pair state when there are too few valid pairs to analyze.

Out of scope for this chart:

- trendline;
- smoothing;
- aggregation;
- color/grouping encodings;
- configurable metric controls.

Verification / exit criteria:

- Chart consumes selected rides and the deterministic relationship result.
- Chart does not duplicate Pearson calculation.
- Chart excludes invalid metric pairs from plotted points.
- Chart renders with demo data and with any valid live Strava `Ride[]`.
- Empty and sparse states are understandable and recoverable.

## 4. Relationship Summary and Status Integration

Objective: Surface the deterministic relationship result in a restrained UI without broader interpretation.

Deliverables:

- Relationship view summary displays sample size and Pearson r when valid, for example:

```text
1497 rides · Pearson r = -0.38
```

- Use `validPairCount` where invalid metric pairs were excluded.
- If Pearson r is unavailable, display a compact reason such as:
  - too few valid rides;
  - elevation does not vary in this selection;
  - average speed does not vary in this selection.
- Keep interpretation out of deterministic UI.
- Avoid false precision; format Pearson r with a small fixed precision such as two decimals.

Verification / exit criteria:

- Valid correlation is displayed only when `pearsonR` exists.
- Sparse and zero-variance statuses render clear non-causal messages.
- No UI copy claims statistical significance or causation.

## 5. Integration Tests and Responsive Polish

Objective: Preserve Sprint 3 behavior while covering the new state-driven relationship workflow.

Deliverables:

- Unit tests for the relationship analysis layer.
- Component tests for `RelationshipScatterChart`.
- App/workspace tests for view switching.
- Existing filter, trend, data-source, and app shell tests remain green.
- CSS updates scoped to the new view switcher and relationship chart.
- Mobile/tablet behavior remains reasonable within the current workspace layout.

Verification / exit criteria:

- Switching from Trend to Relationship renders the relationship chart.
- Switching back to Trend renders the existing trend chart.
- Filter changes continue to update the active view.
- Relationship tooltip content includes expected ride details.
- Empty selection behavior works in both views.
- No unrelated layout redesign is introduced.

## 6. Final Verification

Objective: Complete the sprint with the same engineering quality bar as prior sprints.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Exit criteria:

- All required verification commands pass.
- Demo mode remains usable without Strava credentials.
- Live Strava mode still uses normalized rides through the existing data-source boundary.
- No live Strava API calls, model calls, or credentials are required by normal tests.
- No unrelated files are modified.

## Out of Scope

- AI SDK/model calls.
- AI tool wrappers.
- Conversation behavior.
- View Suggestions.
- Comparison mode.
- Configurable x/y metric picker.
- Seasonal overlay.
- Cumulative view.
- Repeated-route matching.
- Weather enrichment.
- Persistence/database.
- Saved analyses.
- Statistical significance testing.
- Regression line or least-squares display.
- Causal claims.
- Elevation-adjusted performance formulas.

## Remaining Ambiguity

The only approved ambiguity is presentation detail: the exact placement and visual styling of the Trend / Relationship control may be chosen during implementation, provided it remains compact, near the visualization header, and does not substantially redesign the workspace.
