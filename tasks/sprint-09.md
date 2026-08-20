# Sprint 09 - Deterministic Trend Analysis Tool

## Sprint Goal

Add a small, reusable deterministic trend-analysis capability for AI use over the currently submitted `selectedRides`.

The assistant should receive structured deterministic evidence about one metric's relationship with calendar time and interpret it cautiously. Sprint 9 does not add bucketed trend analysis, visualization changes, AI-driven state changes, View Suggestions, persistence, forecasting, p-values, statistical significance testing, or causal inference.

Approved Sprint 9 decisions:

- AI tool name: `calculateTrend`.
- Pure helper: `calculateMetricTrend`.
- Helper signature: `calculateMetricTrend(rides: readonly Ride[], metric: MetricKey): MetricTrendAnalysis`.
- Analyze one `MetricKey` at a time.
- Operate only on individual selected rides for Sprint 9.
- Minimum valid metric points: 3.
- Return structured deterministic evidence rather than prose conclusions.
- Keep deterministic trend analysis independent of the current selector UI, Trend visualization controls, and provisional `AnalysisState.aggregation`.
- Do not treat `MetricTrendChart` as an analysis source.
- Do not reuse Seasonal biweekly aggregation as the trend basis.

## 1. Deterministic Trend Helper

Objective: Add a pure analysis helper that evaluates one selected metric against ride calendar time.

Expected files:

- `src/analysis/metricTrends.ts`
- `src/analysis/metricTrends.test.ts`

Deliverables:

- Add `calculateMetricTrend(rides, metric)` and serializable output types.
- Use `MetricKey`, `getRideMetric`, `getMetricDefinition`, and existing finite-value handling patterns.
- Use individual selected rides as valid points when the selected metric value is finite.
- Preserve raw numeric precision.
- Preserve input order and avoid mutation.
- Compare athlete-local `localDate` values without host-timezone shifts.
- Return metric metadata, `sampleCount`, `validPointCount`, `missingCount`, optional `dateRange`, `timeSpanDays`, `metricMin`, `metricMax`, `slopePerDay`, `slopePerYear`, `estimatedChangeOverRange`, `pearsonR`, `rSquared`, `direction`, `status`, and structured warnings where applicable.
- Direction is sign-based and represents only the mathematical direction of the fitted trend.
- `flat` represents genuinely zero/constant behavior, not an arbitrary practical-significance threshold.
- Include `large-date-gap` when the largest adjacent valid-point gap is more than half the selected trend span.
- If implementation would otherwise duplicate substantial Pearson/regression math, extract only a small focused statistical helper.

Verification / exit criteria:

- Tests cover empty selection.
- Tests cover fewer than 3 valid metric points.
- Tests cover optional/non-finite metric exclusion.
- Tests cover zero time variance.
- Tests cover zero metric variance.
- Tests cover known increasing and decreasing trends.
- Tests cover flat/noisy data with raw trend evidence.
- Tests cover local-date ordering without timezone shifts.
- Tests cover missing counts and warnings, including `large-date-gap`.
- Tests confirm no input mutation or reordering.

## 2. Server Tool Integration

Objective: Expose `calculateTrend` as a server-side deterministic AI tool over submitted selected rides.

Expected files:

- `api/_chat/schema.ts`
- `api/_chat/tools.ts`
- `api/_chat/chat.test.ts`

Deliverables:

- Add a validated tool input schema for one metric key.
- Execute `calculateMetricTrend(selectedRides, metric)` over the submitted `selectedRides` only.
- Return structured helper output without raw ride arrays.
- Preserve `summarizeSelection`, `relationshipBetweenMetrics`, and `compareGroups` behavior.
- Preserve existing client request shape, model configuration, and UI behavior.
- Preserve production-safe `.js` ESM specifiers for local imports reachable from `/api/chat`.

Verification / exit criteria:

- Tool schema accepts valid metric keys.
- Tool schema rejects invalid metrics.
- Tool operates only over submitted `selectedRides`.
- Tool result contains no raw ride arrays.
- Existing deterministic AI tools remain green.
- Chat endpoint tests continue to make no live OpenAI or Strava calls.

## 3. Final Verification And Closeout

Objective: Verify the complete Sprint 9 behavior and record any durable limitations.

Deliverables:

- Confirm grounding remains adequate for deterministic observations versus model interpretation.
- Do not broaden prompt wording unless tool discoverability fails in smoke testing.
- Do not add selector redesign, visualization polish, markdown rendering, response-length tuning, View Suggestions, or AI-driven `AnalysisState` changes.
- At sprint completion, append a concise `## Closeout Notes` section to this file.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- All required verification commands pass.
- Existing Trend, Relationship, Seasonal, Cumulative, grouped comparison, and chat behavior remains green.
- Normal tests require no live OpenAI or Strava calls.
- Smoke testing confirms the assistant can call `calculateTrend` for selected-ride questions such as whether average speed increased, decreased, or appears roughly flat over the selected period.
- The assistant interprets slope, estimated change, Pearson r, rSquared, sample count, time span, and warnings without implying practical significance, statistical significance, forecasting, or causation.

## Out Of Scope

- Selector redesign.
- Visualization redesign or polish.
- Bucketed trend analysis.
- Complex cohort/query construction.
- AI-driven `AnalysisState` changes.
- View Suggestions.
- Persistence, saved chats, database, server session, or server cache.
- Forecasting.
- Causal inference.
- P-values, statistical significance testing, or practical-significance thresholds.
- Broad chat, prompt, markdown, or UI polish.

## Risks And Constraints

- Ride-level trend can be noisy and confounded by route mix, elevation, distance, weather, seasonality, sport type, and selection shape.
- Sparse or uneven selections can make slopes misleading; output must expose sample counts, time span, and gap warnings.
- The tool can only analyze rides included in the submitted selection and must not imply access to broader source data.
- Current selector and visualization controls are expected to change later; this sprint must not encode current UI concepts into the trend-analysis API.
- Top-level `AnalysisState.aggregation` remains provisional/obsolete-looking and must not drive this helper.
- Any later approved material scope change should be reflected in this file before or alongside implementation.

## Remaining Ambiguity

No remaining approval issue is known.

## Closeout Notes

- Shipped `calculateMetricTrend` as the deterministic ride-level trend helper and `calculateTrend` as the server-side AI tool.
- Trend analysis operates only on submitted `selectedRides` and remains independent of selector UI, Trend visualization controls, and provisional `AnalysisState.aggregation`.
- Returned evidence includes slope, estimated change over range, Pearson r, rSquared, sample/time-span information, statuses, and structured warnings.
- No bucketed trend analysis, forecasting, p-values, significance testing, practical-significance thresholds, or causal inference were added.
- Production smoke testing confirmed the assistant discovers and calls `calculateTrend` for trend questions across weak upward trends, effectively flat/no-clear-trend cases, insufficient one-ride selections, large date gaps, multiple metrics, and questions naming years outside the current selection.
- The assistant used slope, estimated change, Pearson r, rSquared, sample count, time span, and warnings as evidence rather than claiming statistical significance after a narrow grounding fix.
- A smoke test exposed unsupported “practical or statistical significance” wording; Sprint 9 added a focused instruction preventing those claims unless a deterministic tool explicitly supplies that assessment.
- Another smoke-test bug showed prior tool results from earlier selections could remain in model-visible history; diagnostics confirmed current `AnalysisState`, derived `selectedRides`, and per-send request bodies were correct, while stale data came from preserved assistant tool parts.
- The fix strips prior assistant `tool-*` parts before model-message conversion, preserving user/assistant text history while keeping current submitted context authoritative.
- Regression smoke testing confirmed selection changes such as `2017 + 2025` to `2025 only` are reflected correctly on the next chat turn without stale cohort contamination.
- Final verification: `npm run typecheck`, `npm run lint`, `npm test` (30 files, 332 tests), and `npm run build` passed; the existing Vite chunk-size warning remains unchanged.
- Deferred work: bucketed/calendar trend analysis if justified, selector/state redesign, richer cohort construction, visualization refinement, View Suggestions, AI-driven `AnalysisState` changes, broader response-length/markdown polish, and a future per-turn analysis-snapshot model if historical tool-result continuity becomes desirable.
- Architectural lesson: current analysis context must remain authoritative across chat turns, and selection-sensitive deterministic tool outputs from older turns must not silently masquerade as current evidence.
