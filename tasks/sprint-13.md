# Sprint 13 - Conversation Loop And Suggestion Lifecycle

## Sprint Goal

Polish the human/AI conversation loop and View Suggestion UX so suggestions remain useful during manual exploration, Apply continues analysis automatically, assistant tables render properly, and request-size behavior is measured without introducing unnecessary transport architecture.

Approved Sprint 13 decisions:

- Pending View Suggestions remain actionable until the conversation or underlying data context moves on.
- Manual `AnalysisState` changes do not invalidate pending suggestions.
- Apply uses the suggestion's original validated constrained patch against the current `AnalysisState`.
- Apply must not install an old stored complete `proposedState`.
- Suggestions have four lifecycle states: pending, applied, dismissed, ignored.
- Automatic post-Apply analysis should run after the updated state and selected activities are authoritative.
- Assistant Markdown should support GFM tables safely.
- Current request-size evidence supports keeping the 2000 selected-activity cap.

## 1. Suggestion Contract And Patch Application

Objective: Update the View Suggestion contract so Apply can patch current state safely.

Expected files:

- `src/state/viewSuggestions.ts`
- `src/state/viewSuggestions.test.ts`
- `api/_chat/schema.ts`
- `api/_chat/chat.test.ts`

Deliverables:

- Store the original validated constrained `patch` in `ViewSuggestion`.
- Remove `proposedState` from the public/runtime suggestion contract unless implementation discovers a concrete preview need.
- Remove `sourceStateFingerprint` from Apply/stale semantics.
- Keep `changes` presentation-only; never reconstruct a patch from `changes`.
- Add or expose a pure helper that:
  - receives current `AnalysisState`;
  - receives a validated suggestion or patch;
  - applies field-level replacement semantics;
  - restores fixed Seasonal/Cumulative fields where needed;
  - validates and returns the complete resulting state.
- Preserve existing patch validation rules and strict state validation.
- Preserve production-safe `.js` imports for server-reachable modules.

Verification / exit criteria:

- Suggestion output includes the validated patch.
- Applying a patch to current state preserves unrelated current fields.
- Patching a field intentionally replaces the current value for that field.
- Invalid or no-op patches remain rejected where appropriate.
- Runtime suggestion schema no longer requires obsolete complete-state Apply data.

## 2. Client Lifecycle And Data-Context Invalidation

Objective: Implement the approved pending/applied/dismissed/ignored lifecycle and remove stale-state UI caused by manual exploration.

Expected files:

- `src/components/ConversationPanelShell.tsx`
- `src/components/ConversationPanelShell.test.tsx`
- `src/components/AppShell.tsx`
- `src/state/viewSuggestions.ts` if a shared data-context helper is useful.

Deliverables:

- Render lifecycle states:
  - pending: full card with Apply and Dismiss;
  - applied: full card with `Suggestion applied`;
  - dismissed: full card with `Suggestion dismissed`;
  - ignored: full card with `Suggestion ignored`.
- Manual view/filter/metric changes do not mark suggestions stale or ignored.
- Apply patches the current `AnalysisState`, validates it, and commits through `AppShell`.
- Remove full-state fingerprint Apply gating and stale-state warning UI.
- When the user manually submits another chat message, mark all currently pending prior suggestions ignored before sending.
- New Chat clears transcript/statuses; pending suggestions from the cleared conversation are no longer actionable.
- Add a narrow deterministic data-context identity for suggestion lifecycle only:
  - current source identifier;
  - deterministic ordered activity IDs.
- Mark pending suggestions ignored when source plus ordered activity identity changes.
- Same-source refresh with unchanged ordered activity identity keeps pending suggestions actionable.

Verification / exit criteria:

- Apply after unrelated manual state changes preserves those unrelated changes.
- Apply after same-field manual changes uses the suggestion's patched value.
- Manual state changes alone do not disable Apply.
- Manual chat submit marks prior pending suggestions ignored.
- Source switch or changed activity identity marks pending suggestions ignored.
- Same-source refresh with identical activity identity preserves pending suggestions.
- Applied/dismissed/ignored cards retain original content and have no actions.

## 3. Automatic Post-Apply Analysis

Objective: After a user applies a suggestion, automatically continue the analysis against the updated state and selected activities.

Expected files:

- `src/components/ConversationPanelShell.tsx`
- `src/components/ConversationPanelShell.test.tsx`
- `api/_chat/schema.ts`
- `api/_chat/prompt.ts`
- `api/_chat/chat.test.ts`

Deliverables:

- On successful Apply, store a pending automatic follow-up intent with compact applied-suggestion context.
- Wait until props reflect the patched current `AnalysisState` and recomputed `selectedActivities`.
- Submit the follow-up request with:
  - current `AnalysisState`;
  - current `selectedActivities`;
  - dataset profile;
  - counts/source metadata;
  - compact applied-suggestion context.
- Do not insert fake visible user prose.
- Do not use AI SDK `regenerate` if it risks replacing prior assistant/suggestion history.
- Preserve prior assistant `tool-*` stripping from model-visible history.
- Keep the current submitted state and selected activities authoritative.

Verification / exit criteria:

- Apply triggers exactly one automatic follow-up when the applied state is current.
- Automatic follow-up sends updated selected activities, not pre-Apply data.
- No visible synthetic user message is rendered.
- Applied-suggestion context contains no raw activities or prior tool outputs.
- Existing manual chat submit behavior remains green.

## 4. GFM Markdown Tables

Objective: Render assistant Markdown tables properly without broad chat redesign.

Expected files:

- `src/components/ConversationPanelShell.tsx`
- `src/components/ConversationPanelShell.test.tsx`
- `src/styles.css`
- `package.json`
- `package-lock.json`

Deliverables:

- Add `remark-gfm`.
- Configure assistant `react-markdown` rendering to support GFM tables.
- Allow semantic table elements for assistant messages only.
- Keep raw HTML disabled.
- Preserve current safe-link handling.
- Add scoped assistant Markdown table styling.
- Keep wide tables contained with local horizontal scrolling rather than page overflow.
- Do not broadly redesign chat typography or layout.

Verification / exit criteria:

- Assistant GFM tables render as semantic tables.
- Tables remain contained inside the message/conversation width.
- Raw HTML is still not trusted.
- Safe and unsafe link behavior remains unchanged.
- User messages and suggestion cards remain unaffected by Markdown rendering.

## 5. Payload Measurement, Docs, Verification, And Closeout

Objective: Document request-size findings, confirm the cap decision, smoke test the conversation loop, and close the sprint.

Expected files:

- `README.md`
- `docs/AI-DESIGN.md`
- `docs/ARCHITECTURE.md`
- `tasks/sprint-13.md`
- Tests only if closeout reveals a current-contract gap.

Deliverables:

- Record current payload/request-size findings:
  - approximately 100 activities: 33 KiB;
  - 500: 161 KiB;
  - 1000: 320 KiB;
  - 1500: 479 KiB;
  - 2000: 638 KiB;
  - 1000 plus representative message history: 328 KiB.
- Document that selected activities dominate request size and message history is currently smaller.
- Keep the current 2000 selected-activity cap unless implementation/testing uncovers a concrete reason to change it.
- Do not add sessions, cache, persistence, compression, or broader transport redesign without stronger evidence.
- Update durable docs for the revised View Suggestion lifecycle, patch-Apply behavior, automatic follow-up, and GFM table support.
- Run final manual smoke tests.
- Append a concise `## Closeout Notes` section at sprint completion.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Verification / exit criteria:

- Manual smoke confirms Apply patches current state after manual exploration.
- Manual smoke confirms Apply automatically continues analysis on the updated selection.
- Pending suggestions become ignored on a later manual user message.
- Source/data-context changes make pending suggestions ignored.
- GFM tables render correctly in production-like use.
- Current AI grounding and deterministic tool behavior remain intact.
- All required commands pass.

## Out Of Scope

- New deterministic analysis tools.
- New visualization features.
- Hover/tooltips.
- Weather enrichment.
- Persistence or database chat history.
- Generalized query language.
- Broad transport architecture.
- Broad prompt redesign.
- Generic conflict-resolution machinery.
- Broad chat typography/layout redesign.

## Risks And Migration Concerns

- Automatic post-Apply follow-up must not submit before React has committed the patched state and recomputed selected activities.
- Removing full-state fingerprint gating shifts safety to patch validation and data-context identity; tests must prove unrelated current state is preserved.
- Multiple pending suggestions can still create UX ambiguity, mitigated for now by ignored-on-new-message behavior.
- Data-context identity should be narrow but deterministic; source plus ordered activity IDs is the approved starting point.
- GFM tables add a dependency and table elements to Markdown rendering; raw HTML and unsafe links must remain blocked.
- Request size is acceptable in current measurements, but selected activities remain the dominant scaling factor.

## Remaining Ambiguity

- No remaining approval issue is known.
- If implementation discovers a concrete need to retain `proposedState` for preview/debug, keep it clearly non-authoritative for Apply and document the reason.
