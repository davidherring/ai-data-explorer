# Sprint 10 - Analysis State And Activity Model Stabilization

## Sprint Goal

Stabilize and simplify the analysis state, selector, metric, activity-type, and visualization configuration architecture before AI-driven View Suggestions or further major analysis features.

Sprint 10 should improve semantic correctness and make the manual analysis model expressive enough for future AI-driven state changes without coupling them to provisional UI behavior.

Approved Sprint 10 decisions:

- Add recurring seasonal month/day ranges as a distinct selection concept.
- Remove `elapsedTimeMinutes` from the active domain and metric model.
- Remove `temperatureF` from the active domain and metric model.
- Centralize typed metric validity by visualization.
- Rename the generalized domain model from `Ride` to `Activity`.
- Add support for `Walk` and `Hike` alongside existing cycling activity types.
- Add narrow multi-year visual encoding for Trend and Relationship.
- Remove obsolete top-level `AnalysisState.aggregation`.
- Keep `comparison` for Sprint 10 unless phase audit proves zero-risk removal; treat it as provisional.
- Preserve current submitted-`selectedActivities` AI grounding.
- Do not add View Suggestions, AI-driven state mutation, new deterministic analysis tools, weather enrichment, broad visualization polish, or a generic query language.

Sprint 10 intentionally supersedes earlier Sprint 8/9 examples that included elapsed-time output, temperature availability, and Ride-specific terminology.

## 1. Domain Rename And Activity Source Scope

Objective: Migrate the active domain from `Ride` to `Activity` and broaden supported Strava activity types without changing analytical behavior.

Expected files:

- `src/data/ride.ts` or replacement activity model file.
- `src/data/rideDataSource.ts` and related hook/component names where semantics are general.
- `api/_strava/activities.ts`
- `api/_strava/normalizeActivity.ts`
- API/client schemas and tests using the normalized domain type.
- Fixture and test helpers that currently create rides.

Deliverables:

- Introduce normalized `Activity` type and migrate general domain references from `Ride` to `Activity`.
- Rename `selectedRides` concepts to `selectedActivities` where they represent the generalized selected activity set.
- Preserve production-safe `.js` local imports for anything reachable from `/api/chat`.
- Add `Walk` and `Hike` to the supported Strava activity allowlist.
- Keep existing cycling activity support, including `Ride`, `MountainBikeRide`, `GravelRide`, `VirtualRide`, `EBikeRide`, `EMountainBikeRide`, `Velomobile`, and `Handcycle`.
- Do not broaden into an exhaustive Strava taxonomy project.
- Do not rename concepts that are genuinely cycling-specific unless their semantics become general.

Verification / exit criteria:

- Normalization tests cover cycling, `Walk`, and `Hike`.
- Source loading tests confirm unsupported activities remain filtered out.
- User-facing generic labels use activity terminology where the data is no longer cycling-specific.
- AI request schema and tool closures still operate over submitted current selected activities only.
- No stale general-domain references to `Ride` remain except where explicitly justified.

## 2. AnalysisState And Recurring Date-Range Cleanup

Objective: Stabilize selection semantics and remove obsolete global aggregation state.

Expected files:

- `src/state/analysisState.ts`
- `src/analysis/filterRides.ts` or renamed filtering helper.
- `src/components/ActivitySelectionControls.tsx`
- `src/components/AnalysisWorkspaceShell.tsx`
- `api/_chat/schema.ts`
- State/filter/control tests.

Deliverables:

- Remove top-level `AnalysisState.aggregation`.
- Keep Seasonal `aggregation: 'biweekly-median'` and Cumulative `accumulation: 'continuous'` inside their discriminated view configs.
- Add distinct recurring month/day range state, for example:

```ts
type MonthDay = {
  month: number
  day: number
}

type RecurringDateRange = {
  type: 'recurring-month-day'
  start: MonthDay
  end: MonthDay
}
```

- Add recurring range to activity selection without overloading year-bearing `dateRange`.
- Recurring range composes with years and other filters using AND semantics.
- Do not support wraparound ranges in Sprint 10; require `start <= end` within the same calendar year.
- Target behavior: selecting years `[2017, 2020, 2025]` plus March 15 through June 20 selects that same seasonal window within each selected year.
- Keep `comparison` in `AnalysisState` but mark it as provisional/deferred in this file unless phase audit proves zero-risk removal.

Verification / exit criteria:

- State contract tests reflect removed `aggregation` and new recurring date-range shape.
- Filtering tests cover recurring month/day ranges across multiple selected years.
- Filtering tests cover AND composition with ordinary filters.
- Invalid or reversed recurring ranges are handled deterministically.
- Chat request validation accepts the updated state shape and rejects obsolete top-level `aggregation`.

## 3. Metric Model Cleanup And View-Specific Validity

Objective: Simplify the metric model and centralize which metrics are meaningful for each visualization.

Expected files:

- `src/state/analysisState.ts`
- `src/analysis/rideMetrics.ts` or renamed metric module.
- `src/analysis/aiContext.ts`
- `src/analysis/groupComparisons.ts`
- `src/analysis/metricRelationships.ts`
- `src/analysis/metricTrends.ts`
- `src/analysis/seasonalMetrics.ts`
- `src/analysis/cumulativeMetrics.ts`
- `src/components/MetricViewControls.tsx`
- `api/_chat/schema.ts`
- Fixtures, tests, and docs referencing removed metrics.

Deliverables:

- Remove `elapsedTimeMinutes` from the normalized model, `MetricKey`, metric metadata, schemas, fixtures, deterministic outputs, AI context, grouped comparisons, trend analysis, and tests.
- Keep `movingTimeMinutes`.
- Remove `temperatureF` from the normalized model, `MetricKey`, metric metadata, schemas, fixtures, deterministic outputs, AI context, UI, and tests.
- Do not implement weather enrichment.
- Record weather/temperature enrichment as future work rather than retaining an always-missing metric.
- Centralize typed metric capability/valid-view metadata.
- Approved initial view validity:
  - Trend: `averageSpeedMph`, `distanceMiles`, `elevationGainFeet`, `movingTimeMinutes`
  - Relationship: `averageSpeedMph`, `distanceMiles`, `elevationGainFeet`, `movingTimeMinutes`
  - Seasonal: `averageSpeedMph`, `distanceMiles`, `elevationGainFeet`, `movingTimeMinutes`
  - Cumulative: `distanceMiles`, `elevationGainFeet`, `movingTimeMinutes`
- Cumulative must not offer average speed.
- Keep deterministic analysis helpers independent of visualization-specific metric restrictions unless analytically necessary.

Verification / exit criteria:

- Metric metadata tests cover valid metrics by view.
- Metric controls use centralized metadata rather than scattered conditionals.
- Cumulative metric controls exclude average speed.
- AI schemas reject removed metric keys.
- Dataset profiles, summaries, grouped comparisons, and trends omit elapsed time and temperature.
- Existing deterministic tools remain available and operate on the updated metric set.

## 4. Visualization Correctness

Objective: Add narrow multi-year visual encoding and keep existing views behaviorally intact under the new state and metric model.

Expected files:

- `src/components/MetricTrendChart.tsx`
- `src/components/RelationshipScatterChart.tsx`
- Relevant chart tests.
- Shared helpers only if needed to avoid duplicating a small year-series convention.

Deliverables:

- Trend distinguishes points by year when more than one year is present.
- Relationship distinguishes points by year when more than one year is present.
- Seasonal remains as-is for year encoding.
- Cumulative remains unchanged for Sprint 10.
- Do not broaden into general chart styling or hover-tooltip polish.
- Preserve current responsive Plot lifecycle behavior unless a direct bug appears.

Verification / exit criteria:

- Chart tests confirm multi-year point encoding behavior without asserting Observable Plot internals too tightly.
- Existing Trend, Relationship, Seasonal, and Cumulative behavior remains green.
- No richer hover tooltip UI is added.

## 5. Final Schema, Docs, Verification, And Closeout

Objective: Align server/client schemas, docs, and tests after the migration.

Expected files:

- `api/_chat/schema.ts`
- `README.md`
- Relevant docs if implementation reveals durable contract changes.
- `tasks/sprint-10.md`

Deliverables:

- Ensure `/api/chat` request validation matches updated `AnalysisState`, `Activity`, and `MetricKey` shapes.
- Preserve current submitted-`selectedActivities` grounding model and stale-tool-result stripping.
- Update durable documentation only where the domain/model changes need to be discoverable.
- At sprint completion, append a concise `## Closeout Notes` section to this file.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- All required commands pass.
- Existing Trend, Relationship, Seasonal, Cumulative, grouped comparison, trend analysis, and chat behavior remains green except for approved Sprint 10 semantic changes.
- Normal tests require no live OpenAI or Strava calls.
- Production-safe `.js` import specifiers are preserved for code reachable from `/api/chat`.

## Out Of Scope

- AI-driven `AnalysisState` mutation.
- View Suggestions.
- New deterministic analysis tools.
- Weather enrichment.
- Bucketed trend analysis.
- Exhaustive Strava taxonomy support.
- Broad visualization redesign or polish.
- Rich hover tooltip implementation.
- Generic query language.
- Persistence, saved chats, database, server session, or server cache changes.

## Risks And Migration Concerns

- The `Ride` to `Activity` migration is intentionally broad and should happen before deeper metric cleanup so later edits target the final domain names.
- Removing metrics touches shared state, schemas, deterministic tools, fixtures, and tests; keep the change mechanical and well-covered.
- Chat request schemas must stay aligned with the app state and normalized activity shape.
- Existing Sprint 8/9 task examples containing elapsed time or temperature are historical and intentionally superseded by Sprint 10.
- Recurring month/day validation must be deterministic and should avoid wraparound semantics in this sprint.
- `comparison` remains provisional; future work should not assume its current shape is final.

## Remaining Ambiguity

No remaining approval issue is known.
