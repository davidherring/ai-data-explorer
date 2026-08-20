# Sprint 08 - Deterministic Group Comparison Tool

## Sprint Goal

Add a deterministic `compareGroups` capability so the AI can compare groups within the current selected rides, with year-to-year comparison as the first concrete use case.

The assistant should receive structured deterministic results and interpret them cautiously. Sprint 8 does not let the AI change `AnalysisState`, create View Suggestions, or access rides outside the submitted selection.

Approved Sprint 8 decisions:

- Use `compareGroups` as the Sprint 8 abstraction.
- Operate only on submitted `selectedRides`; do not expand the client/server data contract.
- Allow explicit requested groups such as `[2019, 2026]`.
- Support `year`, `month`, `dayMode`, and `dayOfWeek` when they fit the existing grouping/types architecture.
- Keep `sportType` as composition output, not a grouping key.
- Keep output focused: useful metric summaries, relevant composition differences, warnings, and pairwise deltas.
- Preserve deterministic observations versus model interpretation; do not infer causation.
- Keep View Suggestions, AI-driven state changes, persistence, broader data access, and UI polish out of scope.

## 1. Deterministic Group Comparison Helper

Objective: Add a pure analysis helper that partitions selected rides by a supported grouping key and returns structured group summaries.

Expected files:

- `src/analysis/groupComparisons.ts`
- `src/analysis/groupComparisons.test.ts`

Deliverables:

- Add `buildGroupedComparison(rides, options)` or equivalent.
- Support grouping by `year`, `month`, `dayMode`, and `dayOfWeek`.
- Accept optional requested groups and report missing/empty groups explicitly.
- Reuse existing `MetricKey` metadata and finite-value behavior.
- Include per-group ride count, date range, metric summaries, warnings, and focused composition output.
- Include sport type composition counts for each group.
- Include pairwise deltas only when exactly two groups are compared.
- Preserve raw numeric precision.
- Do not mutate or reorder input rides.

Metric summary semantics:

- Include finite count, missing count, mean, median, min, and max for each current `MetricKey`.
- Include totals only for `distanceMiles`, `elevationGainFeet`, `movingTimeMinutes`, and `elapsedTimeMinutes`.
- Do not total `averageSpeedMph` or `temperatureF`.
- Percent deltas are included only when the baseline is finite and non-zero.

Verification / exit criteria:

- Tests cover grouping by each supported key.
- Tests cover requested groups, missing groups, and deterministic sorting.
- Tests cover finite-value filtering, totals, medians, pairwise deltas, and sparse/missing warnings.
- Tests cover sport type composition output.
- Tests confirm no input mutation.

## 2. Server Tool Integration

Objective: Expose `compareGroups` as a server-side deterministic AI tool over submitted selected rides.

Expected files:

- `api/_chat/schema.ts`
- `api/_chat/tools.ts`
- `api/_chat/chat.test.ts`

Deliverables:

- Add validated tool input schema for:
  - `groupBy`;
  - optional requested `groups`.
- Execute `compareGroups` over the submitted `selectedRides` only.
- Return structured helper output without raw ride arrays.
- Keep existing `summarizeSelection` and `relationshipBetweenMetrics` behavior unchanged.
- Do not change model configuration or client request shape.

Verification / exit criteria:

- Tool validates supported grouping keys.
- Tool validates requested group values enough to avoid malformed execution.
- Tool returns deterministic year comparison results for selected rides containing two years.
- Existing chat endpoint tests remain green.
- Normal tests make no live OpenAI or Strava calls.

## 3. Grounding Prompt and Documentation Touches

Objective: Make the new tool discoverable to the model without compensating for missing capabilities through prompt verbosity.

Expected files:

- `api/_chat/prompt.ts` if needed.
- `README.md` or `tasks/sprint-08.md` only if implementation reveals a durable setup or behavior note.

Deliverables:

- Keep grounding instructions concise.
- Ensure the model is reminded that comparisons are deterministic observations, not causal proof.
- Document that `compareGroups` can only compare groups present in the submitted selected rides.
- Do not add UI polish, markdown rendering, View Suggestions, or AI state changes.

Verification / exit criteria:

- Tests still confirm raw rides are not serialized into prompt text.
- Existing production-safe API import conventions are preserved.

## 4. Final Verification and Closeout

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Exit criteria:

- All required verification commands pass.
- Existing Trend, Relationship, Seasonal, Cumulative, and chat behavior remains green.
- No live OpenAI or Strava calls are required by normal tests.
- Sprint 8 closeout records shipped behavior, limitations, and any deferred follow-up.

## Out of Scope

- `compareSelections` over arbitrary independent selections.
- Access to source rides outside submitted `selectedRides`.
- AI-driven `AnalysisState` changes.
- View Suggestions.
- `calculateTrend`.
- Persistence, saved chats, database, server session, or server cache.
- New visualization modes or chart UI for comparisons.
- Broad chat UI polish, markdown rendering, or response verbosity tuning.
- Weather enrichment.
- Regression, p-values, statistical significance, or causal claims.

## Risks and Constraints

- If the current selection contains only one comparison group, the tool must report that limitation rather than reaching outside `selectedRides`.
- Year-to-year questions require the user's current selection to include both years being compared.
- Grouped output should stay compact enough for tool results to remain useful in a narrow chat workflow.
- `AnalysisState.grouping` exists but Sprint 8 should not require changing visible workspace state to run the AI tool.
- `sportType` is composition output only in Sprint 8.

## Remaining Ambiguity

No remaining approval issue is known.

## Closeout Notes

- Shipped deterministic grouped comparison through `buildGroupedComparison` and the `compareGroups` AI tool.
- `compareGroups` operates only on submitted `selectedRides`, keeping grouped analysis downstream of the user's current selection and independent of future selector/UI redesign.
- The capability is reusable across supported grouping keys rather than a year-specific special case.
- Production smoke testing successfully supported 2019 vs 2026, weekday vs weekend within 2025, and 2019 weekday/weekend vs 2025 weekday/weekend comparisons.
- The assistant used grouped summaries with existing deterministic relationship analysis to examine speed, distance, elevation, moving time, and sport mix differences.
- Responses appropriately distinguished observations, associations, hypotheses, and causal claims; sparse or uneven groups were treated cautiously.
- Production behavior showed the assistant can test and refine a user hypothesis rather than only summarize pooled data.
- Selector limitations prevented some precise follow-up cohorts, such as matched date ranges or more complex intersecting selections; this remains deferred selector/state UX work, not a Sprint 8 defect.
- Conversational response length and presentation still need later polish.
- View Suggestions, AI-driven `AnalysisState` changes, and broader UI redesign remain deferred.
