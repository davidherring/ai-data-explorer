# Sprint 03 - Human-Controlled Filtering and First Trend View

## Sprint Goal

Build the first useful human-controlled analysis workspace.

The user should be able to take the active normalized `Ride[]` dataset, refine it with flexible filters, see how many rides match, and inspect average speed over calendar time in a points-only trend visualization.

This sprint establishes reusable deterministic filtering and state-driven visualization patterns for later views and AI tools.

Do not implement AI functionality, comparison mode, scatter, seasonal overlay, cumulative view, rolling averages, connected trend lines, or calendar aggregation in this sprint.

Approved Sprint 3 decisions:

- Keep `ActivitySelection.sportType?: string` as a single-select filter.
- Year selection is the primary date control.
- Exact start/end date range is supported as an optional refinement.
- If year and exact date range are both active, they intersect.
- Use Observable Plot for the first production visualization.
- Render the Sprint 3 trend as points-only average speed over calendar time.
- Do not add a connected line, rolling average, or calendar aggregation.
- Selection count is required.
- Basic averages may be included only if they remain lightweight.

## 1. Deterministic Filtering Foundation

Objective: Add a pure, reusable filtering layer that applies `ActivitySelection` to normalized `Ride[]`.

Deliverables:

- `src/analysis/` function for filtering rides by `ActivitySelection`.
- Source-agnostic behavior for demo and live Strava rides.
- Inclusive numeric range filtering for distance and elevation.
- Deterministic date filtering using normalized date/year fields.
- Lightweight helpers for available filter options where needed by the UI.

Filtering semantics:

- All active filters are combined with AND.
- Undefined or empty filters do not constrain the selection.
- `years` matches `ride.year`.
- `dateRange.start` and `dateRange.end` compare against `ride.localDate`.
- If `years` and `dateRange` are both active, the result is their intersection.
- `dayMode: "all"` does not filter.
- `dayMode: "weekday"` and `"weekend"` use `ride.isWeekend`.
- `daysOfWeek` filters by exact normalized day names.
- `distanceMiles.min/max` and `elevationGainFeet.min/max` are inclusive.
- `sportType` matches `ride.sportType`.
- Filtering must not mutate source rides.

Verification / exit criteria:

- Unit tests cover each filter dimension and combined-filter behavior.
- Empty selections are represented as an empty `Ride[]`, not as an error.
- Filtering tests do not require network, Strava credentials, or browser APIs.

## 2. AnalysisState Wiring

Objective: Make the workspace derive its selected rides from shared `AnalysisState` rather than chart-local state.

Deliverables:

- `AppShell` or the nearest shared workspace owner stores `AnalysisState`.
- Workspace components receive the current `AnalysisState` and state update callback.
- Selected rides are derived from active source `Ride[]` plus `analysisState.selection`.
- The default state remains a single-selection trend of `averageSpeedMph`.
- No global state-management library is introduced.

Verification / exit criteria:

- Changing analysis controls updates `AnalysisState`.
- Visualization and status derive from the same selected ride set.
- Existing optional `comparison` type remains unused by the UI in Sprint 3.

## 3. Filter Controls

Objective: Replace placeholder analysis controls with generic, athlete-agnostic controls for the primary selection.

Deliverables:

- Year control derived from available ride years, with an all-years option.
- Optional exact start and end date inputs.
- Weekday/weekend/all control.
- Specific day-of-week controls.
- Distance min/max controls.
- Elevation min/max controls.
- Sport type selector derived from available normalized ride sport types, with an all-types option.
- Reset filters action.

Verification / exit criteria:

- Controls update the shared `AnalysisState`.
- Controls do not hard-code personal ride categories or athlete-specific routines.
- Controls behave consistently for demo and live Strava datasets.
- Invalid or blank numeric/date inputs do not corrupt analysis state.

## 4. Selection Status

Objective: Give the user immediate feedback about the active selection without expanding the sprint into a full summary system.

Deliverables:

- Selected ride count out of total active-source rides.
- Clear empty-selection message.
- Clear sparse-selection message when too few rides are selected for visual interpretation.
- Optional lightweight averages if they remain compact:
  - average speed;
  - average distance;
  - average elevation.

Verification / exit criteria:

- Selection count updates when filters change.
- Empty selections are understandable and recoverable.
- Status UI remains compact and does not displace the main controls or chart.

## 5. Average-Speed Trend Visualization

Objective: Implement the first production visualization: average speed over calendar time for the active selection.

Deliverables:

- Add Observable Plot dependency.
- React chart component that renders an Observable Plot SVG into a managed container.
- Points-only trend with:
  - x-axis from `ride.localDate`;
  - y-axis from `ride.averageSpeedMph`;
  - one point per selected ride;
  - readable axis labels and units;
  - accessible chart label or description.
- Empty state when no rides match.
- Sparse selections shown as individual points without false continuity.

Verification / exit criteria:

- Chart consumes normalized `Ride[]` and shared `AnalysisState` outputs.
- Chart does not duplicate filtering logic.
- No connected line, rolling average, smoothing, or calendar aggregation is added.
- Chart renders with demo data and with any valid live Strava `Ride[]`.

## 6. Verification and Responsive Polish

Objective: Preserve the green engineering harness and make the workspace presentable across common screen sizes.

Deliverables:

- Unit tests for deterministic filtering.
- Component tests for state-driven controls, selected count, empty state, and chart rendering behavior where practical.
- Responsive CSS for chart, controls, status, and existing conversation shell.
- Basic portfolio-quality layout polish without adding unrelated product features.

Verification / exit criteria:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
- Demo mode remains usable without Strava credentials.
- Live Strava mode continues to use normalized rides through the existing data-source boundary.

## Out of Scope

- AI assistant behavior.
- AI tools.
- Conversation state changes.
- Comparison UI or comparison calculations.
- Relationship/scatter view.
- Seasonal overlay view.
- Cumulative view.
- Calendar aggregation.
- Rolling averages or smoothing.
- Saved selections.
- New persistence.
- New global state-management library.

