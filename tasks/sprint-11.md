# Sprint 11 - Typed AI View Suggestions

## Sprint Goal

Add typed AI View Suggestions as validated, user-controlled proposed `AnalysisState` changes.

The assistant may propose a useful view or filter change, but it must never mutate `AnalysisState` automatically. The user explicitly applies or dismisses the suggestion.

Approved Sprint 11 decisions:

- Use AI tool name `proposeViewSuggestion`.
- The model proposes a constrained typed patch, not a complete raw `AnalysisState`.
- The server applies the validated patch to the exact submitted `currentAnalysisState`, constructs a complete candidate `proposedState`, validates it, and returns only valid structured suggestions.
- `AppShell` remains the owner of `AnalysisState`.
- Applying a suggestion requires a matching deterministic source-state fingerprint.
- Stale suggestions must not silently merge or apply.
- Do not support `comparison`, `grouping`, arbitrary cohort/query expressions, persistence, saved suggestions, or automatic state mutation.
- Keep `comparison` provisional/deferred.
- Preserve deterministic analytical tools, submitted-`selectedActivities` grounding, and stale prior analytical tool-result stripping.
- Include a narrow markdown rendering fix for assistant messages.

## 1. Shared State Validation And Suggestion Contract

Objective: Create a reusable typed state/suggestion contract that can validate model-proposed changes without duplicating incompatible state rules.

Expected files:

- `src/state/analysisState.ts`
- New or extracted state validation/schema module as needed.
- `api/_chat/schema.ts`
- State and schema tests.

Deliverables:

- Expose reusable strict validation for `AnalysisState`.
- Preserve validation for:
  - discriminated view configuration;
  - active `MetricKey` set;
  - Cumulative additive-only metric restriction;
  - recurring month/day validity, including Feb 29;
  - recurring start <= end;
  - numeric-range shape;
  - date-range structure;
  - supported weekdays/day modes;
  - strict object schemas.
- Define the `proposeViewSuggestion` patch input contract:
  - `label`;
  - optional `rationale`;
  - constrained `patch`.
- Support view patches for:
  - Trend `yMetric`;
  - Relationship `xMetric` and `yMetric`;
  - Seasonal `yMetric` while preserving fixed `biweekly-median`;
  - Cumulative additive `yMetric` while preserving fixed `continuous`.
- Support selection patches for:
  - `years`;
  - `dayMode`;
  - `daysOfWeek`;
  - `dateRange`;
  - `recurringDateRange`;
  - `distanceMiles`;
  - `elevationGainFeet`;
  - `sportType`.
- Reject unsupported `comparison`, `grouping`, arbitrary query expressions, and unknown fields.
- Define deterministic source-state fingerprinting over the exact submitted `AnalysisState`.
- Preserve production-safe `.js` ESM specifiers for server-reachable imports.

Verification / exit criteria:

- Valid patch produces a validated complete `proposedState`.
- Proposed state derives from submitted `currentAnalysisState`.
- Invalid view/metric combinations are rejected.
- Cumulative average speed is rejected.
- Invalid or reversed recurring ranges are rejected.
- Unsupported `comparison` and `grouping` patches are rejected.
- Fingerprint output is deterministic.

## 2. Server Tool Integration And Prompt Update

Objective: Add the View Suggestion tool beside deterministic analysis tools without weakening numerical grounding.

Expected files:

- `api/_chat/tools.ts`
- `api/_chat/schema.ts`
- `api/_chat/prompt.ts`
- `api/_chat/chat.test.ts`
- Related tool tests.

Deliverables:

- Register `proposeViewSuggestion` as an AI tool.
- Tool input uses the constrained patch schema from Phase 1.
- Tool execution:
  - reads the submitted `currentAnalysisState`;
  - applies the validated patch;
  - constructs and validates complete `proposedState`;
  - returns `id`, `label`, optional `rationale`, `proposedState`, compact `changes`, and `sourceStateFingerprint`.
- Preserve existing tools unchanged:
  - `summarizeSelection`;
  - `relationshipBetweenMetrics`;
  - `compareGroups`;
  - `calculateTrend`.
- Remove the old prompt instruction prohibiting View Suggestions.
- Add concise prompt guidance:
  - View Suggestions are optional;
  - suggestions do not mutate state automatically;
  - use them only when a view/filter change would materially improve the analysis;
  - deterministic tools remain required for numerical claims;
  - do not repeatedly propose unnecessary state changes.
- Do not broadly rewrite the system prompt.

Verification / exit criteria:

- `streamText` receives `proposeViewSuggestion` with existing deterministic tools.
- Tool output contains no raw activity arrays.
- Submitted selected activities remain tool-only and are not serialized into prompt text.
- Stale prior analytical tool outputs remain stripped.
- Normal tests make no live OpenAI or Strava calls.

## 3. Client Suggestion Card, Apply/Dismiss, And Stale-State Guard

Objective: Render validated suggestions and keep the user in control of state application.

Expected files:

- `src/components/AppShell.tsx`
- `src/components/ConversationPanelShell.tsx`
- `src/components/ConversationPanelShell.test.tsx`
- `src/styles.css`
- Small helper/component files if needed.

Deliverables:

- Pass an apply-suggestion callback from `AppShell` to `ConversationPanelShell`.
- Render suggestion cards from `proposeViewSuggestion` tool output.
- Show:
  - label;
  - optional rationale;
  - compact changes;
  - Apply;
  - Dismiss.
- Apply:
  - confirms `sourceStateFingerprint` still matches current `AnalysisState`;
  - applies the complete validated `proposedState` through normal state ownership/update flow;
  - marks the suggestion applied locally.
- Dismiss:
  - does not mutate state;
  - marks or hides the suggestion locally.
- If current state no longer matches the source fingerprint:
  - prevent Apply;
  - show compact stale-state indication;
  - require a new suggestion.
- New Chat clears local suggestion status with the conversation.
- Do not create a synthetic transcript message when a suggestion is applied in Sprint 11.
- Do not redesign the workspace, selector layout, or chat panel.

Verification / exit criteria:

- Suggestion UI renders.
- Apply updates state only when fingerprint matches.
- Stale suggestion cannot apply.
- Dismiss does not mutate state.
- New Chat clears local suggestion status.
- Existing chat send/current-state behavior remains green.

## 4. Markdown Rendering, Docs, Verification, And Closeout

Objective: Fix narrow assistant markdown rendering and close the sprint with aligned documentation and verification.

Expected files:

- `src/components/ConversationPanelShell.tsx`
- `src/components/ConversationPanelShell.test.tsx`
- `src/styles.css`
- `package.json` / lockfile if dependency is added.
- `README.md` and relevant docs if durable behavior changes need documenting.
- `tasks/sprint-11.md`

Deliverables:

- Add `react-markdown` unless implementation audit reveals a concrete bundle or security problem.
- Render assistant markdown instead of exposing literal markdown markers.
- Do not enable raw HTML rendering.
- Support:
  - ordinary paragraphs;
  - bold/emphasis;
  - ordered and unordered lists;
  - inline code;
  - safe links if compatible with app expectations.
- GFM tables are not required.
- Do not broaden into chat layout redesign, panel sizing, typography overhaul, scrolling redesign, or general message styling polish.
- Update durable docs only where needed.
- At sprint completion, append a concise `## Closeout Notes` section to this file.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- Assistant markdown renders without literal `**` or list syntax.
- Raw HTML is not enabled.
- All required commands pass.
- Existing deterministic tools, chat grounding, and stale-tool-result stripping remain green.

## Out Of Scope

- Automatic AI-driven `AnalysisState` mutation.
- State conflict merging or stale-state reconciliation.
- Saved or persistent suggestions.
- Comparison-mode redesign.
- Generic query language or arbitrary cohort expressions.
- New deterministic analytical tools.
- Broad selector redesign.
- Broad visualization polish.
- Rich tooltip work.
- Broad chat layout, typography, or scrolling polish.
- Database, server session, cache, or persistence work.

## Risks And Migration Concerns

- Letting the model directly author full `AnalysisState` would bypass typed state safety.
- Suggestion validation must remain aligned with the same state contract used by `/api/chat`.
- Suggestions generated from stale state must not apply silently after manual user changes.
- View Suggestions must not replace deterministic analytical tools for numerical claims.
- `comparison` remains provisional and should not be used as a shortcut for comparison-mode UX.
- Markdown rendering should avoid raw HTML and avoid turning Sprint 11 into a chat polish sprint.
- Production-safe `.js` import specifiers must be preserved for server-reachable modules.

## Remaining Ambiguity

No remaining approval issue is known.

## Closeout Notes

- Shipped reusable strict `AnalysisState` validation for shared client/server state and chat contracts, plus typed constrained View Suggestion patches.
- Registered `proposeViewSuggestion` as a server-side AI tool: the model supplies only a constrained patch, while the server derives and validates the complete `proposedState`.
- Suggestions include deterministic source-state fingerprints; AI suggestions never mutate `AnalysisState` automatically, and `AppShell` remains the state owner.
- Suggestion cards support Apply/Dismiss. Apply requires a matching current-state fingerprint, stale suggestions cannot apply, and Dismiss never mutates analysis state.
- Applied/dismissed cards retain original suggestion content as conversation history while replacing buttons with terminal status.
- Suggestion cards render after assistant explanatory text. Successful Apply sends compact one-turn `recentlyAppliedViewSuggestion` metadata on the next matching chat turn without exposing raw activities or prior tool results.
- Prior assistant `tool-*` parts continue to be stripped from model-visible history; current submitted `AnalysisState` and `selectedActivities` remain authoritative.
- Prompt guidance now normally makes concrete supported recommendations actionable through `proposeViewSuggestion`; deterministic analytical tools remain required for numerical claims.
- Assistant markdown is safely rendered with `react-markdown`; user messages remain plain text, raw HTML is not enabled, and safe links are restricted to approved schemes.
- Production smoke testing confirmed useful suggestion cards, correct Apply behavior, post-Apply continuity, stale-state protection, fixed card ordering/lifecycle issues, improved markdown readability, and continued deterministic-tool grounding.
- Final verification: `npm run typecheck` passed; `npm run lint` passed; `npm test` passed with 33 files and 395 tests; `npm run build` passed. Existing Vite chunk-size warning remains.
- Deferred: multiple simultaneous suggestion UX, accepted-suggestion persistence/transcript event modeling, stale-state reconciliation, broader selector/query capability, provisional `comparison` state, richer markdown/GFM, broader chat polish, large-payload transport scaling, and suggestion persistence/database support.
- Architectural lesson: View Suggestions are safest as typed proposals against a specific source state, with explicit user application and fingerprint-based stale-state protection.
