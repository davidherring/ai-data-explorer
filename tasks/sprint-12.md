# Sprint 12 - Manual Controls And Responsive Workspace

## Sprint Goal

Redesign the manual analysis controls and responsive workspace around the stable typed analysis model.

Focus on control hierarchy, selector semantics, responsive correctness, and conversation-panel accessibility without adding new analytical capability.

Approved Sprint 12 decisions:

- Separate analysis controls from selection controls.
- Keep View and Metric controls with the chart.
- Put primary selection controls first: Years and Activity type.
- Put advanced filters in collapsed-by-default `More Filters`: Days, absolute date range, Seasonal window, distance, and elevation.
- Show a compact active-filter count on `More Filters` if it is useful and low-cost.
- Preserve deterministic tools, current submitted `selectedActivities` grounding, View Suggestions, fingerprint stale-state protection, recently-applied suggestion continuity, shared validation, and safe markdown rendering.
- Preserve Trend, Relationship, Seasonal, and Cumulative analytical behavior except for approved selector-semantic changes.

## 1. State Semantics And Filtering Migration

Objective: Update `AnalysisState` selection semantics before redesigning the controls that edit them.

Expected files:

- `src/state/analysisState.ts`
- `src/state/analysisStateValidation.ts`
- `src/state/viewSuggestions.ts`
- `src/analysis/filterActivities.ts`
- `api/_chat/schema.ts`
- State/filter/View Suggestion/chat tests.

Deliverables:

- Make explicit `selection.years` the single source of truth.
- Remove empty-years-means-all behavior: `years: []` means zero matching activities.
- Keep default source-independent state valid while allowing available-year initialization after data loads.
- Remove `dayMode` from:
  - `ActivitySelection`;
  - manual filtering;
  - shared validation;
  - View Suggestion selection patches.
- Retain `dayMode` only as a deterministic grouping concept:
  - `GroupingKey = 'dayMode'`;
  - `compareGroups` weekday/weekend grouping behavior.
- Make `recurringDateRange` explicit full-year state by default:
  - start `01-01`;
  - end `12-31`.
- Treat the Seasonal window as a real filter value, not a display placeholder.
- Reset restores full-year Seasonal window; do not clear it to `undefined`.
- Keep absolute `dateRange` separate and composable with the recurring Seasonal window using AND semantics.
- Preserve production-safe `.js` imports for modules reachable from `/api/chat`.

Verification / exit criteria:

- State defaults validate.
- `years: []` selects zero activities.
- Selected years filter exactly.
- Full-year recurring range behaves like a real inclusive range.
- Absolute and recurring ranges compose with AND semantics.
- `dayMode` no longer affects selection filtering or View Suggestion patches.
- `compareGroups` dayMode grouping remains green.
- Chat schema and View Suggestion schema match the new state contract.

## 2. Selection Controls And Year Initialization

Objective: Rebuild manual selection controls around the approved hierarchy and initialize data-dependent years safely.

Expected files:

- `src/components/AppShell.tsx`
- `src/components/AnalysisWorkspaceShell.tsx`
- `src/components/ActivitySelectionControls.tsx`
- `src/styles.css`
- Selection/workspace/App tests.

Deliverables:

- Primary controls:
  - Years;
  - Activity type.
- Collapsed `More Filters`:
  - Days;
  - absolute date range;
  - Seasonal window;
  - distance;
  - elevation.
- Add Select all / Clear all for years.
- Add Select all / Clear all for days.
- Remove the weekday/weekend selector from manual controls.
- Add explicit Start and End clear controls for absolute dates.
- Rename/reframe Seasonal window clear action as Reset seasonal window.
- Keep temporary incomplete Seasonal window input local until it forms a valid recurring range.
- Initialize all available years selected when a source first loads.
- On source change, initialize years from the new source.
- On same-source refresh:
  - preserve a narrowed user selection;
  - remove unavailable years;
  - auto-select newly available years only when the prior selection represented all previously available years.
- Reset filters restores all available years, all days, full-year Seasonal window, and clears optional non-default filters.

Verification / exit criteria:

- Demo and Strava source loads select all available years by default.
- Clearing all years selects zero activities.
- Selecting all years restores all available years.
- Same-source refresh preserves narrowed year choices and handles added/removed years deterministically.
- Source change initializes against the new source's years.
- Day Select all / Clear all behave deterministically.
- More Filters is collapsed by default and indicates active filters when implemented.
- Absolute date Start/End clear controls work on desktop/mobile.
- Seasonal window reset restores `01-01` to `12-31`.

## 3. Chart Header, Summary Region, And Responsive Overflow

Objective: Give chart controls and summary information stable homes and eliminate mobile overflow caused by chart/control layout.

Expected files:

- `src/components/AnalysisWorkspaceShell.tsx`
- `src/components/MetricTrendChart.tsx`
- `src/components/RelationshipScatterChart.tsx`
- `src/components/SeasonalMetricChart.tsx`
- `src/components/CumulativeMetricChart.tsx`
- `src/components/MetricViewControls.tsx`
- `src/components/SelectionStatus.tsx`
- `src/styles.css`
- Chart/workspace responsive tests.

Deliverables:

- Structure chart cards as:
  - title / analytical heading;
  - View controls;
  - view-specific Metric controls;
  - stable selection-summary region;
  - visualization.
- Move selection count and averages into a stable summary strip or equivalent clear region.
- Ensure View and Metric controls reflow within the chart card at phone widths.
- Ensure Relationship X/Y metric controls remain contained.
- Avoid brittle fixed/min widths that force horizontal scrolling.
- Preserve existing Plot lifecycle and analytical chart behavior.
- Keep Seasonal and Cumulative behavior intact except for surrounding layout.

Verification / exit criteria:

- Trend, Relationship, Seasonal, and Cumulative still render and behave as before analytically.
- Single-metric and multi-metric control rows wrap or stack cleanly.
- Selection summary remains readable without crowding the chart header.
- Supported phone widths have no horizontal page scrolling from chart controls.
- Existing chart lifecycle tests remain green.

## 4. Conversation Panel, Docs, Verification, And Closeout

Objective: Keep the composer readily accessible, align durable docs, and close the sprint with full verification.

Expected files:

- `src/components/ConversationPanelShell.tsx`
- `src/styles.css`
- `README.md`
- `docs/DATA-MODEL.md`
- `docs/UX.md`
- `docs/ARCHITECTURE.md`
- `docs/AI-DESIGN.md`
- `tasks/sprint-12.md`
- Conversation/docs tests if needed.

Deliverables:

- On desktop/laptop, keep the conversation composer accessible while messages scroll within the panel.
- On mobile, keep the conversation panel in normal document flow and avoid fixed/sticky behavior that conflicts with the keyboard.
- Optionally replace the text `Send` button with a paper-airplane icon if it remains a small change and keeps accessible label `Send`.
- Update durable docs for:
  - explicit year semantics;
  - removed selection `dayMode`;
  - retained grouped-comparison `dayMode`;
  - explicit full-year Seasonal window;
  - selection/control hierarchy;
  - View Suggestion/schema alignment where relevant.
- At sprint completion, append a concise `## Closeout Notes` section.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- Composer remains readily accessible on desktop/laptop while messages scroll.
- Mobile conversation remains in normal document flow.
- Manual smoke tests cover demo loading, Strava loading, selection controls, More Filters, date clearing, Seasonal reset, chart controls, mobile overflow, AI grounding, and View Suggestions.
- All required commands pass.

## Out Of Scope

- New deterministic analysis tools.
- New AI features.
- AI-driven `AnalysisState` mutation.
- Transport or payload scaling work.
- Hover tooltip implementation.
- Suggestion-history redesign.
- Generic query language.
- Broad visualization aesthetics beyond responsive/control restructuring.
- Persistence or database work.

## Risks And Migration Concerns

- Year and day selection semantics affect filtering, selected activity counts, AI grounding, View Suggestion fingerprints, and stale-state checks.
- Static `defaultAnalysisState` cannot know available years; source-aware initialization must avoid races and accidental selection resets.
- Removing `dayMode` from selection while retaining it for grouped comparison requires careful classification of references.
- Making Seasonal window explicit changes default state, reset behavior, fingerprints, chat payloads, and View Suggestion no-op detection.
- Mobile overflow may come from intrinsic control widths, Plot width minimums, or flex children that fail to shrink.
- Conversation panel changes should preserve mobile keyboard behavior.

## Remaining Ambiguity

No remaining approval issue is known.
