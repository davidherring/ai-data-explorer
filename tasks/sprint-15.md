# Sprint 15 - Final Hardening And MVP Release

## Sprint Goal

Perform final hardening and portfolio-release preparation for the AI Data Explorer MVP.

Sprint 15 is the final planned MVP sprint. It should fix only concrete correctness, usability, accessibility, reliability, documentation, or release-presentation issues that matter before calling the project finished.

Approved Sprint 15 decisions:

- No release blockers were found in the opening audit.
- Fix the narrow data-source status/error visibility issue.
- Do not broaden generic chat error handling unless implementation reveals an extremely small, clearly worthwhile improvement.
- Clean up stale current-product documentation.
- Improve README portfolio presentation.
- Finish with concise production smoke testing and an explicit stop-building/release recommendation.

## 1. Docs And Portfolio Presentation

Objective: Make the repository immediately understandable and align current durable documentation with the implemented MVP.

Expected files:

- `README.md`
- `docs/PRODUCT.md`
- other current durable docs only if inspection finds a concrete stale statement

Deliverables:

- Add the live deployment URL: `https://ai-data-explorer-one.vercel.app`.
- Make clear that Demo works immediately without Strava authorization.
- Add a concise “what to try” path for a hiring manager or engineer reviewing the project.
- Keep setup/environment instructions accurate and server-secret guidance intact.
- Correct stale `docs/PRODUCT.md` current-product language:
  - manual day filtering uses explicit `daysOfWeek`;
  - weekday/weekend is retained only as deterministic grouped-comparison behavior;
  - View Suggestion behavior matches the current patch/lifecycle architecture;
  - automatic post-Apply behavior replaces stale synthetic-event wording;
  - currently implemented deterministic tools are distinguished from future candidate tools.
- Do not rewrite historical sprint records.

Verification / exit criteria:

- README clearly explains the deployed portfolio demo, local setup, architecture at a high level, and what to try first.
- Current durable product docs do not contradict implemented selection, AI tool, or View Suggestion behavior.
- No secrets or private data are introduced.

## 2. Data-Source Status And Error Visibility

Objective: Make source loading, disconnected, and error states visible near the data-source interaction area without redesigning source management.

Expected files:

- `src/components/AppShell.tsx`
- `src/components/ActivityDataSourceControl.tsx`
- `src/styles.css`
- related source/workspace tests

Deliverables:

- Keep Demo as the default source.
- Preserve Strava OAuth behavior and current data-loading architecture.
- Preserve source-aware year initialization and reconciliation.
- Make source/loading/disconnected/error state understandable near the source selector or relevant workspace area.
- Avoid an apparently empty or broken workspace when Strava is disconnected, loading, or failing.
- Keep the solution small and compatible with Sprint 12 layout.
- Leave generic chat error handling unchanged unless a trivial wording/presentation improvement is clearly worthwhile.

Verification / exit criteria:

- Demo ready state remains unchanged.
- Strava disconnected and Strava error states are visible and understandable.
- Loading state remains visible.
- Empty selected-activity states still behave as intentional filter outcomes.
- Existing source-switching and year-reconciliation tests remain green.

## 3. Final Verification And Release Smoke

Objective: Run the final verification baseline and a concise production smoke pass.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Manual smoke checklist:

- Open production Demo.
- Confirm Demo loads immediately with the real 1,000-activity fixture.
- Ask one normal AI analysis question.
- Apply one View Suggestion.
- Confirm automatic follow-up analyzes the newly applied state naturally.
- Inspect representative chart tooltip behavior.
- Verify one GFM table response if practical.
- Check narrow/mobile view for obvious horizontal overflow.
- Confirm source/status behavior is understandable.
- Confirm Strava path still works if convenient.
- Confirm one representative error path is graceful.
- Check for unexpected production console errors.

Accessibility check:

- Keyboard navigation through source control, primary filters, More Filters, View/Metric controls, chat input/send, and View Suggestion Apply/Dismiss.
- Visible focus remains usable.
- Chart accessible labels remain present.
- Assistant tables remain semantic.

Verification / exit criteria:

- Standard commands pass.
- Smoke testing does not reveal release blockers.
- Any issue found is either fixed within Sprint 15 scope or explicitly deferred as non-blocking.

## 4. Closeout And MVP Release Decision

Objective: Record the final release state and decide whether active MVP development should stop.

Expected files:

- `tasks/sprint-15.md`

Deliverables:

- Append concise `## Closeout Notes`.
- Record final fixes.
- Record final test baseline.
- Record manual production smoke results.
- Note the existing non-blocking Vite chunk-size warning.
- Preserve confirmed portfolio metrics:
  - 4 interactive visualization modes;
  - 4 deterministic analytical AI tools plus typed View Suggestion workflow;
  - 1,000 sanitized real-data Demo activities;
  - 849 `Ride` / 151 `Walk`;
  - 418 automated tests across 33 test files at audit baseline;
  - 2,000 selected-activity chat guard;
  - 3 MB request-body guard.
- Record consciously deferred work.
- State whether the AI Data Explorer MVP is portfolio-ready and whether active feature development should stop.

Verification / exit criteria:

- Closeout notes are concise and factual.
- The final recommendation is explicit.
- No new product capability is added during closeout.

## Out Of Scope

- New analytical tools.
- New visualizations.
- Weather enrichment.
- Persistent chat/history.
- Generalized query language.
- New View Suggestion capabilities.
- Broad auth/rate-limit infrastructure.
- Transport redesign.
- Speculative performance work.
- Broad visual redesign.
- Instrumentation added only to manufacture resume metrics.

## Risks And Approval Decisions

- Need the production deployment URL verified during docs/smoke: `https://ai-data-explorer-one.vercel.app`.
- Decide during Phase 2 whether source status visibility needs only placement/copy changes or a tiny workspace-level status surface.
- Keep the existing Vite large-chunk warning unless a concrete user-visible performance issue appears.
- Keep `/api/chat` public with current guards unless production evidence justifies reopening auth/rate-limit architecture.
