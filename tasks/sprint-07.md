# Sprint 07 - Grounded AI Conversation

## Sprint Goal

Turn the placeholder AI panel into a real streamed analytical conversation experience grounded in the current manual analysis state.

The user can inspect and change the visualization manually, ask a question, and receive a streamed answer that uses the `AnalysisState` snapshot and deterministic tools. Sprint 7 does not let the AI change `AnalysisState` or create View Suggestions.

Approved Sprint 7 decisions:

- Use a stateless `/api/chat` endpoint.
- Send the current `AnalysisState` snapshot, selected normalized rides, compact dataset profile, counts, and source metadata on each submitted user message.
- Do not serialize raw ride arrays into the model prompt.
- Server-side tools may operate deterministically over submitted selected rides.
- Use browser-memory transcript only.
- New Chat clears the transcript.
- Use direct OpenAI provider with `gpt-5.6-luna`, centralized behind a small config constant.
- Approved packages: `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `zod`.
- Initial tools are only `summarizeSelection` and `relationshipBetweenMetrics`.
- Defer `calculateTrend`, View Suggestions, persistence, server sessions, caches, repeat Strava fetches, and AI-driven state changes.

## 1. Deterministic AI Context + `summarizeSelection`

Objective: Add compact deterministic context helpers that can ground the model without requiring it to inspect raw rides.

Deliverables:

- Add a compact dataset profile helper for source rides.
- Add a pure `summarizeSelection(selectedRides)` helper.
- Include metric availability and finite-value handling using current metric metadata.
- Include ride count, date range, metric summaries, totals where meaningful, and missing/sparse-data warnings.
- Keep helpers deterministic, typed, serializable, and directly unit tested.
- Do not introduce persistence or AI SDK code in this phase.

Verification / exit criteria:

- Tests cover empty selections.
- Tests cover finite-value filtering.
- Tests cover optional temperature availability.
- Tests cover summary fields for all current `MetricKey` values.
- Tests cover sparse/missing-data warnings.

## 2. Server Chat Endpoint + Tools + Streaming

Objective: Add a server-side chat endpoint that validates request data, exposes deterministic tools, and streams model responses.

Deliverables:

- Add `/api/chat` route and a testable internal handler.
- Validate request shape with `zod`.
- Fail clearly for malformed requests and unreasonable payload sizes.
- Build compact system/context messages from:
  - app grounding instructions;
  - dataset profile;
  - current `AnalysisState`;
  - selected-count/source metadata;
  - visible chat messages.
- Keep submitted rides available to tool execution, not pasted into prompt text.
- Add `summarizeSelection` tool.
- Add `relationshipBetweenMetrics` tool wrapping the existing deterministic relationship helper.
- Stream responses with AI SDK `streamText`.
- Keep model ID centralized and easy to change.

Verification / exit criteria:

- Endpoint rejects non-POST requests.
- Endpoint rejects invalid bodies.
- Endpoint rejects unreasonable ride payloads.
- Tool wrappers validate metric keys and return structured outputs.
- Tests mock model/AI SDK behavior; no live model calls.
- No `OPENAI_API_KEY` is exposed to client code.

## 3. Chat UI Integration

Objective: Replace the placeholder AI panel with a compact usable chat UI connected to the new endpoint.

Deliverables:

- Wire `ConversationPanelShell` to current rides, selected rides, source metadata, and `AnalysisState`.
- Use current AI SDK React APIs after installed API verification.
- Send the current analysis snapshot only when the user submits a message.
- Render user and assistant messages from message parts.
- Show streaming/loading/error states.
- Add composer and submit behavior.
- Add New Chat that clears browser-memory transcript without changing analysis state.
- Keep tool calls hidden or surfaced only as minimal status text.
- Do not redesign the workspace.

Verification / exit criteria:

- UI tests cover composing and sending a message with the current analysis snapshot.
- UI tests cover New Chat clearing transcript.
- UI tests cover loading and error states.
- Existing manual analysis controls and charts remain green.

## 4. Grounding, Security, Docs, Final Verification

Objective: Harden the MVP AI behavior and close the sprint with docs and verification.

Deliverables:

- Add concise assistant instructions for analytical humility:
  - distinguish observation, relationship, hypothesis, and causation;
  - avoid invented performance claims;
  - avoid training prescriptions;
  - acknowledge sparse/missing/confounded data.
- Add `OPENAI_API_KEY` to `.env.example` without a `VITE_` prefix.
- Document local setup and the no-live-model-tests expectation where appropriate.
- Confirm no AI path mutates `AnalysisState`.
- Confirm no View Suggestions are implemented.
- Confirm raw rides are not serialized into prompt text.

Required commands:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Exit criteria:

- All required verification commands pass.
- Normal tests require no live OpenAI or Strava calls.
- Existing Trend, Relationship, Seasonal, and Cumulative behavior remains green.
- No unrelated files are modified.
- No commit or push is made unless explicitly requested.

## Out of Scope

- `calculateTrend`.
- AI-driven `AnalysisState` changes.
- View Suggestions.
- Comparison mode.
- Persistence, saved chats, database, server session, or server cache.
- Repeat Strava fetches for AI tool calls.
- Weather enrichment.
- MCP or external agent frameworks.
- Broad visualization or workspace redesign.

## Remaining Ambiguity

No remaining approval issue is known.
