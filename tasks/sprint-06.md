# Sprint 06 - Seasonal and Cumulative Views

## Sprint Goal

Add implemented Seasonal and Cumulative visualization modes on top of the metric-configurable analysis architecture established in Sprint 5.

The sprint is limited to:

- Seasonal view;
- Cumulative view;
- discriminated view-state extensions;
- deterministic transforms for both views;
- compact metric controls;
- focused chart components;
- tests and scoped styling.

Do not implement AI behavior, AI tool wrappers, View Suggestions, comparison mode, persistence, saved analyses, weather enrichment, regression/significance testing, or workspace redesign.

Approved Sprint 6 decisions:

- Seasonal uses biweekly median aggregation.
- Seasonal sparse buckets are `sampleCount < 2`.
- Seasonal sparse buckets remain visible as points.
- Seasonal connects only adjacent non-sparse buckets within the same year.
- Seasonal does not fill missing buckets and does not smooth.
- Cumulative uses continuous accumulation only.
- Seasonal aggregation and Cumulative accumulation belong inside their discriminated view configuration.
- Do not use top-level `AnalysisState.aggregation` to reproduce Seasonal or Cumulative views.
- Do not broadly remove/refactor the old top-level `aggregation` field in this sprint.

## 1. View State and Metric Metadata

Objective: Make Seasonal and Cumulative implemented view types whose visible behavior is reproducible from `AnalysisState.view`.

Preferred state shapes:

```ts
type SeasonalViewConfiguration = {
  type: 'seasonal'
  yMetric: MetricKey
  aggregation: 'biweekly-median'
}

type CumulativeViewConfiguration = {
  type: 'cumulative'
  yMetric: MetricKey
  accumulation: 'continuous'
}
```

Defaults:

```ts
{
  type: 'seasonal',
  yMetric: 'averageSpeedMph',
  aggregation: 'biweekly-median',
}
```

```ts
{
  type: 'cumulative',
  yMetric: 'distanceMiles',
  accumulation: 'continuous',
}
```

Deliverables:

- Replace the current unimplemented Seasonal/Cumulative future view shape with explicit discriminated configurations.
- Add `defaultSeasonalView` and `defaultCumulativeView`.
- Extend metric metadata roles only as needed for Seasonal Y and Cumulative Y controls.
- Preserve top-level `AnalysisState.aggregation` for compatibility, but do not depend on it for the new views.

Verification / exit criteria:

- State tests cover default Seasonal and Cumulative configs.
- State tests show each new view carries the fields required to reproduce visible behavior.
- Existing Trend and Relationship state behavior remains green.

## 2. Deterministic Seasonal Transform

Objective: Add a pure transform that converts selected rides into year-grouped biweekly median series.

Semantics:

- Input is already-filtered `selectedRides`.
- Metric is driven by `MetricKey`.
- Exclude missing, `NaN`, `Infinity`, and `-Infinity` metric values.
- Bucket by within-year biweekly calendar position using normalized `ride.weekOfYear`.
- Produce one aggregated value per `year` and biweekly bucket.
- Aggregated value is the median of finite metric values in that year/bucket.
- Include `sampleCount`.
- Mark `sparse: true` when `sampleCount < 2`.
- Do not emit missing buckets.
- Do not fill gaps.
- Do not smooth.
- Do not mutate source rides.

Suggested output fields:

```ts
type SeasonalMetricBucket = {
  year: number
  bucketIndex: number
  startWeek: number
  endWeek: number
  value: number
  sampleCount: number
  sparse: boolean
}
```

Verification / exit criteria:

- Unit tests cover multiple years on the same bucket axis.
- Unit tests cover median behavior for odd and even sample counts.
- Unit tests cover sparse marking.
- Unit tests cover missing bucket omission.
- Unit tests cover finite-value filtering.

## 3. Deterministic Cumulative Transform

Objective: Add a pure transform that converts selected rides into a continuous cumulative metric series over calendar time.

Semantics:

- Input is already-filtered `selectedRides`.
- Metric is driven by `MetricKey`.
- Default metric is distance.
- Exclude missing, `NaN`, `Infinity`, and `-Infinity` metric values.
- Sort by `localDate`, with stable deterministic tie handling for same-day rides.
- Accumulate continuously across the selected date range.
- Do not reset by year in Sprint 6.
- Do not mutate source rides.

Suggested output fields:

```ts
type CumulativeMetricPoint = {
  date: Date
  localDate: string
  rideId: string
  ride: Ride
  value: number
  cumulativeValue: number
}
```

Verification / exit criteria:

- Unit tests cover chronological sorting.
- Unit tests cover same-day deterministic ordering.
- Unit tests cover continuous accumulation across year boundaries.
- Unit tests cover finite-value filtering.
- Unit tests cover empty input and no-valid-values behavior.

## 4. Controls and View Switching

Objective: Make all four implemented MVP view modes reachable through compact state-driven controls.

Deliverables:

- Extend `AnalysisViewSwitcher` to Trend / Relationship / Seasonal / Cumulative.
- Switching views preserves `AnalysisState.selection` and other unrelated state fields.
- Switching to Seasonal uses `defaultSeasonalView`.
- Switching to Cumulative uses `defaultCumulativeView`.
- Extend `MetricViewControls` to support:
  - Seasonal: `Metric`;
  - Cumulative: `Metric`.
- Source metric options from metadata and active-source finite-value availability.
- Do not add aggregation or accumulation mode selectors in Sprint 6.

Verification / exit criteria:

- Component/workspace tests cover switching to Seasonal and Cumulative.
- Metric-control tests cover Seasonal and Cumulative metric updates.
- Existing Trend and Relationship controls remain green.

## 5. Seasonal Chart

Objective: Render the Seasonal transform without embedding aggregation logic inside the chart component.

Deliverables:

- Add a dedicated Seasonal chart component.
- Consume structured seasonal buckets from the analysis layer.
- Chart title derives from metric metadata and aggregation mode.
- X-axis represents biweekly within-year calendar position.
- Y-axis derives from metric metadata.
- Render year-specific series.
- Sparse buckets remain visible as points.
- Connect only adjacent non-sparse buckets within the same year.
- Do not connect across missing buckets or sparse buckets.
- Empty selected-rides and no-valid-metric states are clear and recoverable.
- Tooltip/title includes year, bucket/week range, metric value, and sample count.

Verification / exit criteria:

- Component tests cover title/accessibility text, sample counts, sparse bucket visibility, and SVG mounting.
- Tests do not assert Observable Plot internals beyond user-visible behavior and expected mounted output.

## 6. Cumulative Chart

Objective: Render continuous cumulative accumulation without embedding accumulation logic inside the chart component.

Deliverables:

- Add a dedicated Cumulative chart component.
- Consume structured cumulative points from the analysis layer.
- Chart title derives from metric metadata and continuous accumulation mode.
- X-axis is calendar date.
- Y-axis is cumulative metric value.
- Tooltip/title includes local date, ride metric value, cumulative value, and basic ride context.
- Empty selected-rides and no-valid-metric states are clear and recoverable.

Verification / exit criteria:

- Component tests cover title/accessibility text, cumulative tooltip values, no-valid-metric state, and SVG mounting.
- Tests do not assert Observable Plot internals beyond user-visible behavior and expected mounted output.

## 7. Workspace Integration and Styling

Objective: Wire the new views into the current workspace without redesigning it.

Deliverables:

- `AnalysisWorkspaceShell` derives Seasonal and Cumulative data from `selectedRides` and `analysisState.view`.
- Existing Trend and Relationship behavior remains unchanged.
- Remove the unimplemented-view placeholder behavior for Seasonal and Cumulative.
- CSS changes are scoped to new chart/status needs and existing header-control layout.
- Note in implementation report that top-level `AnalysisState.aggregation` may be obsolete cleanup after Sprint 6.

Verification / exit criteria:

- Workspace tests cover rendered Seasonal and Cumulative views from `AnalysisState.view`.
- Filter changes continue to affect all active views through `selectedRides`.
- Demo mode remains usable without Strava credentials.

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
- No unrelated files are modified.
- No commit or push is made unless explicitly requested.

## Out of Scope

- AI SDK/model calls.
- AI tools.
- Conversation behavior changes.
- View Suggestions.
- Comparison mode.
- Persistence.
- Saved analyses.
- Weather enrichment.
- Regression lines.
- P-values or statistical significance testing.
- Causal claims.
- Filter drawer redesign.
- Broad workspace redesign.

## Remaining Ambiguity

No remaining product approval issue is known.

## Closeout

- Shipped implemented Seasonal and Cumulative views, explicit discriminated view configurations, compact metric controls, deterministic transforms, and dedicated chart components.
- Seasonal uses biweekly median buckets by year, preserves sparse buckets as points, connects only adjacent non-sparse buckets, and does not smooth or fill gaps.
- Cumulative uses continuous accumulation over the selected range only, with no reset-by-year mode in Sprint 6.
- `AnalysisWorkspaceShell` owns derived Seasonal/Cumulative data; charts remain render-only consumers of structured analysis output.
- Current repo verification passes `typecheck`, `lint`, `test`, and `build`; `npm test` currently reports 28 files / 297 tests.
- Follow-ups left at sprint end: top-level `AnalysisState.aggregation` appears obsolete, crowded header/toolbar cleanup is deferred, and repeated chart lifecycle consolidation is deferred.
