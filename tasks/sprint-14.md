# Sprint 14 - Portfolio Polish And Demo Readiness

## Sprint Goal

Complete a compact portfolio-polish pass by adding useful chart inspection tooltips, replacing the tiny synthetic demo fixture with a realistic sanitized activity snapshot, aligning durable Sprint 13 documentation, and confirming current public-usage safeguards are adequate.

Approved Sprint 14 decisions:

- Use the smallest practical Observable Plot-native tooltip approach, preferably `Plot.tip` plus pointer interaction.
- Preserve current chart analytical semantics, marks, year coloring, legends, lifecycle, SVG title/ARIA behavior where useful, and responsive layout.
- Replace the current tiny synthetic demo fixture with a static bundled JSON snapshot of sanitized real normalized activities.
- Demo remains the default source for normal visitors; `?strava=connected` may still select Strava after OAuth callback.
- Do not add source-selection persistence.
- Public Strava/OpenAI posture is document-and-observe for Sprint 14; do not add origin checks, rate limiting, auth, or new infrastructure unless implementation discovers a concrete low-cost correctness/security issue.
- Align durable docs with final Sprint 13 View Suggestion behavior and request-size findings.

## 1. Chart Tooltip And Activity Inspection

Objective: Add useful hover/tooltip inspection to Trend, Relationship, Seasonal, and Cumulative charts without broad chart redesign.

Expected files:

- `src/components/MetricTrendChart.tsx`
- `src/components/RelationshipScatterChart.tsx`
- `src/components/SeasonalMetricChart.tsx`
- `src/components/CumulativeMetricChart.tsx`
- related chart tests
- optional tiny chart-local helper if it avoids duplication

Deliverables:

- Trend tooltips inspect individual activities and include date, activity type, active metric, distance, elevation gain, and moving time.
- Relationship tooltips inspect individual activities and include date, activity type, x metric, y metric, and useful non-duplicated activity context.
- Seasonal tooltips describe aggregate biweekly buckets, not individual activities, including year, bucket/week range, metric median, sample count, and sparse status where relevant.
- Cumulative tooltips include date, activity type, per-activity metric value, cumulative value, and useful activity context.
- Preserve existing point/line marks, year encoding, legends, empty states, Plot lifecycle, and accessibility/title behavior where useful.
- Prefer native Plot tooltip/pointer behavior over custom tooltip infrastructure.

Verification / exit criteria:

- Tooltip text is deterministic and metric-driven for all four chart types.
- Individual-activity chart tooltips do not duplicate the active metric unnecessarily.
- Seasonal remains clearly aggregate and sparse buckets remain visible.
- Existing chart lifecycle tests remain green.
- Tests avoid brittle assertions on generated SVG geometry/colors.

## 2. Real Sanitized Demo Snapshot

Objective: Replace the small synthetic fixture with a realistic bundled demo dataset that makes visual and AI analysis meaningful.

Expected files:

- `src/fixtures/demoActivities.json` or equivalent static JSON fixture
- `src/data/demoDataset.ts`
- `src/tests/demoDataset.test.ts`
- data-source tests as needed

Deliverables:

- Use a deterministic static JSON fixture loaded through the existing demo-data path.
- Target approximately 1,000 activities if source data is available.
- Include only normalized `Activity` fields.
- Include only `Ride` and `Walk` unless separately approved.
- Explicitly exclude `EBikeRide`.
- Exclude routes, coordinates/location data, Strava tokens, credentials, raw Strava payloads, and athlete-identifying metadata.
- Replace original activity IDs with deterministic demo IDs such as `demo-activity-0001`.
- Preserve analytical fields such as dates, metrics, and activity type so real temporal/metric relationships remain useful.
- Do not build a general export/import system solely to create the fixture.
- If source activities are not available to Codex during implementation, identify the smallest one-time process needed to provide/create the snapshot rather than adding runtime infrastructure.

Verification / exit criteria:

- Demo loads offline and remains the initial source for normal visitors.
- Fixture validates against the normalized `Activity` shape.
- Fixture has meaningful year coverage.
- `Ride` and `Walk` are present if available in the source snapshot.
- `EBikeRide` is absent.
- IDs are deterministic sanitized demo IDs.
- Trend, Relationship, Seasonal, Cumulative, grouped comparisons, deterministic AI analysis, and View Suggestions have enough demo data to be useful.

## 3. Durable Docs And Public-Exposure Notes

Objective: Align current durable docs with final Sprint 13 behavior and record the Sprint 14 public-usage decision.

Expected files:

- `README.md`
- `docs/AI-DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/UX.md`
- `tasks/sprint-14.md` only if implementation reveals approved scope detail

Deliverables:

- Update View Suggestion docs to reflect executable validated patches and display-only `changes`.
- Document that Apply patches the current `AnalysisState`; no old complete `proposedState` is installed.
- Remove current-contract references to full-state fingerprint stale gates.
- Document pending, applied, dismissed, and ignored lifecycle states.
- Document that ordinary manual state exploration preserves pending suggestions.
- Document that later manual conversation turns ignore pending suggestions.
- Document that source/data-context changes invalidate pending suggestions.
- Document automatic post-Apply analysis and the hidden internal trigger at the appropriate architectural level.
- Document assistant GFM table support.
- Record current payload/cap findings:
  - approximately 100 activities: 33 KiB;
  - 500: 161 KiB;
  - 1000: 320 KiB;
  - 1500: 479 KiB;
  - 2000: 638 KiB;
  - 1000 activities plus representative message history: 328 KiB.
- Record that `selectedActivities` dominate request size, representative message history is comparatively small, and current evidence supports keeping the 2000 selected-activity cap and 3 MB request guard unchanged.
- Document public exposure posture: visitors can initiate Strava OAuth for their own account; `/api/chat` is public but strictly validated and externally budget-capped; no new auth/rate-limit infrastructure is added in Sprint 14.
- Do not rewrite historical sprint records.

Verification / exit criteria:

- Durable docs no longer describe public/runtime `proposedState`, `sourceStateFingerprint`, or stale full-state Apply gating as current behavior.
- Docs accurately describe automatic post-Apply analysis and hidden-trigger behavior without exposing internal implementation as user-facing UI.
- Docs accurately reflect current request-size/cap decision and public-usage posture.

## 4. Final Verification, Smoke, And Closeout

Objective: Verify the portfolio-facing experience and close Sprint 14.

Expected files:

- `tasks/sprint-14.md`
- Tests only if final verification reveals a current-contract gap

Manual smoke checklist:

- Demo loads automatically for a new visitor with useful data.
- Strava can still be selected normally.
- Trend, Relationship, Seasonal, and Cumulative tooltips are useful and do not disrupt chart behavior.
- Year coloring/legends still work where applicable.
- Seasonal tooltips read as aggregate bucket summaries.
- Cumulative tooltips clearly distinguish per-activity and cumulative values.
- Real demo data supports Trend, Relationship, Seasonal, Cumulative, grouped comparisons, deterministic AI analysis, and View Suggestions.
- `/api/chat` still rejects malformed, oversized, and too-many-activity requests.
- Sprint 13 View Suggestion lifecycle, Apply behavior, automatic follow-up, hidden-trigger stripping, and GFM table rendering remain intact.
- Sprint 12 responsive workspace remains intact.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- All required commands pass.
- Manual smoke confirms chart inspection and demo experience are portfolio-ready.
- No new broad auth, persistence, transport, visualization, or AI capability work is introduced.
- Append concise `## Closeout Notes` at sprint completion.

## Out Of Scope

- New deterministic analysis tools.
- New AI capabilities.
- Broad chart redesign.
- New visualization semantics.
- Weather enrichment.
- Persistence/database chat history.
- Generalized query language.
- Broad transport architecture.
- Authentication or rate-limit infrastructure.
- Source-selection persistence.
- Exhaustive Strava taxonomy expansion.

## Risks And Approval Decisions

- Real demo snapshot creation depends on source normalized activities being available to Codex or provided through a one-time approved process.
- JSON fixture size should be monitored, but approximately 1,000 normalized activities is acceptable for the current portfolio goal if build output remains reasonable.
- Native Plot tips may need manual browser verification because automated jsdom tests cannot fully exercise hover/touch behavior.
- Public `/api/chat` remains intentionally public in Sprint 14; revisit only if traffic or abuse evidence changes.
