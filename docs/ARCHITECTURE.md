# Interactive AI Data Explorer — Architecture

## 1. Purpose

This document describes the MVP technical architecture for the Interactive AI Data Explorer.

The architecture should support:

- Strava OAuth and activity retrieval;
- normalized activity data;
- deterministic analytical tools;
- interactive visualizations;
- shared typed analysis state;
- an AI assistant grounded in current application state;
- optional AI-proposed view changes;
- automated testing;
- CI;
- public deployment.

The architecture should remain simple enough to implement and explain quickly.

The project should prefer direct, understandable components over unnecessary abstraction.

---

## 2. High-Level Architecture

Conceptually:

```text
                 ┌─────────────────┐
                 │   Strava API    │
                 └────────┬────────┘
                          │
                          │ OAuth + activities
                          v
                 ┌─────────────────┐
                 │ API / Data      │
                 │ Integration     │
                 └────────┬────────┘
                          │
                          v
                 ┌─────────────────┐
                 │ Normalized      │
                 │ Activity Data   │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              v                       v
     ┌─────────────────┐     ┌─────────────────┐
     │ Analysis State  │     │ Analytical Tool │
     │ + Filtering     │     │ Layer           │
     └────────┬────────┘     └────────┬────────┘
              │                       │
              v                       │
     ┌─────────────────┐              │
     │ Visualization   │              │
     │ Layer           │              │
     └────────┬────────┘              │
              │                       │
              └───────────┬───────────┘
                          │
                          v
                 ┌─────────────────┐
                 │ AI Integration  │
                 │ Vercel AI SDK   │
                 └────────┬────────┘
                          │
                          v
                 ┌─────────────────┐
                 │ LLM             │
                 └─────────────────┘
```
The visualization and AI assistant share the same underlying analytical state and tool layer.

## 3. Frontend

The frontend should use:

React;
TypeScript;
Vite;
D3 and/or Observable Plot for visualization;
Vercel AI SDK UI utilities where appropriate.

The frontend owns:

analysis controls;
current analysis state;
visualization rendering;
chat transcript UI;
View Suggestion interactions;
user-visible loading/error states.

The frontend should not contain hidden analytical logic that is unavailable to the AI tool layer.

Where possible, analysis behavior should be implemented in reusable functions that can be called both from UI code and AI tools.

## 4. Shared Analysis State

The application should maintain a typed AnalysisState.

Conceptually:

```ts
type AnalysisState = {
  selection: ActivitySelection;
  comparison?: ActivitySelection;

  view: ViewConfiguration;

  grouping?: GroupingConfiguration;
};
```

The same state should drive:

visualization rendering;
deterministic summaries;
AI context;
View Suggestion actions.

This shared state is one of the central architectural requirements.

The AI should not maintain an independent representation of what the dashboard is showing.

## 5. State Flow

Typical manual interaction:

User changes filter
      ↓
AnalysisState updates
      ↓
Selection recalculates
      ↓
Summary recalculates
      ↓
Visualization rerenders


Typical AI interaction:

User sends message
      ↓
Capture current AnalysisState
      ↓
Attach deterministic selection summary
      ↓
Send conversation + state to AI endpoint
      ↓
Model may call analytical tools
      ↓
Assistant response returns
      ↓
Optional View Suggestion rendered


Suggestion acceptance:

User clicks View Suggestion
      ↓
Proposed AnalysisState applied
      ↓
Visualization rerenders
      ↓
Acceptance event stored in conversation


## 6. Strava Integration

The application should use Strava OAuth for athlete authentication and API access.

The integration layer should handle:

authorization;
access tokens;
refresh tokens;
token refresh;
activity pagination;
API errors;
API rate limits;
normalization.

Strava API responses should be converted into the internal normalized Activity
model before entering the analytical layer.

The rest of the application should not rely on raw Strava response shapes.


## 7. OAuth Architecture

OAuth secrets must remain server-side.

The browser should never receive:

Strava client secret;
model provider secret;
other private server credentials.

A likely flow:

Browser
  ↓
Start Strava authorization
  ↓
Strava
  ↓
OAuth callback endpoint
  ↓
Exchange authorization code
  ↓
Store/retrieve token information
  ↓
Fetch athlete activities

The precise persistence approach can remain minimal for the MVP.


## 8. Data Persistence

The MVP should use the least complex persistence approach that supports the product.

Potential needs include:

Strava OAuth token information;
normalized activity data or cached API results;
optional athlete bio;
optional conversation state.

Persistent storage should only be introduced where required.

The architecture should not add a database merely to demonstrate database usage.

If server-side persistence is needed, the choice should be made based on actual requirements.


## 9. Data Refresh

The application should support refreshing activities from Strava.

The refresh process should:

authenticate using current/renewed token;
request available activities;
normalize activities;
deduplicate by source activity ID;
update analytical data;
regenerate relevant dataset summaries.

For the MVP, a user-initiated refresh is sufficient.

Automatic webhooks or background synchronization are not required unless implementation proves unusually simple.


## 10. Analytical Layer

The analytical layer should be implemented as deterministic TypeScript functions where practical.

It should own:

filtering;
grouping;
aggregation;
summary calculations;
trend calculations;
comparison calculations;
metric relationship calculations;
similar-activity search;
recent-vs-historical analysis.

The analytical layer should not depend on the LLM.

Example:

```ts
summarizeSelection(
  activities: Activity[]
): SelectionSummary
```

The same function may be used by:

the UI;
automated tests;
AI tools.

## 11. AI Tool Layer

AI tools should be thin typed wrappers around the analytical layer.

Example:

AI tool:
summarizeSelection


        ↓


deterministic function:
summarizeSelection(...)

Initial tools may include:

summarizeSelection
compareSelections
calculateTrend
relationshipBetweenMetrics
findSimilarActivities
summarizeRecentVsHistorical

Tool schemas should be explicit.

Inputs and outputs should be serializable and testable.

## 12. Vercel AI SDK

The Vercel AI SDK should provide the primary application-level AI integration.

It may be used for:

model invocation;
streaming responses;
tool calling;
structured outputs;
UI message handling;
chat transcript management;
structured data parts;
generative UI patterns where useful.

The AI SDK is infrastructure for the AI interaction layer.

It does not replace:

the analytical tools;
D3/Plot;
application state;
Strava integration.


## 13. AI Request Pipeline

A typical request:

POST /api/chat

Input conceptually contains:

{
  messages,
  currentAnalysisState,
  currentSelectionSummary,
  athleteDatasetProfile,
  athleteProfile?
}

The server:

builds application/system context;
converts stored transcript into model messages;
includes current analytical context;
exposes typed analytical tools;
invokes the model;
streams or returns the assistant response;
returns structured suggestion data when present.


## 14. Transcript Model

The frontend may maintain a richer UI transcript than the model directly consumes.

A conversation turn may include:

visible text;
analysis-state snapshot;
tool calls;
tool results;
proposed suggestion;
accepted suggestion event.

The model-facing representation may omit redundant or purely UI-specific information.

This separation allows the application to preserve useful state while controlling context size.


## 15. View Suggestion Architecture

A View Suggestion contains a validated typed proposed state plus the fingerprint
of the exact source `AnalysisState`.

The model does not author a complete `AnalysisState` and must not directly mutate
application state. It calls `proposeViewSuggestion` with a constrained patch. The
server applies that patch to the submitted current state, restores fixed view
configuration fields, validates the resulting state, and returns only valid
structured suggestion data.

Supported first-version patches cover view metric changes and selected activity
filters: years, day mode, days of week, absolute date range, recurring date
range, distance, elevation gain, and sport type. `comparison`, `grouping`, and
arbitrary query language are not supported.

The frontend receives the suggestion and renders Apply/Dismiss controls. Apply
compares the source-state fingerprint with the current `AnalysisState` before
calling:

setAnalysisState(suggestion.proposedState);

Stale suggestions are not merged or reconciled. Sprint 11 does not add synthetic
Apply/Dismiss transcript events.


## 16. Visualization Layer

The visualization layer should be driven entirely by:

normalized activity data;
current analysis state;
analytical outputs.

It should not contain duplicated filter logic.

Core visualization modes:

trend;
relationship;
seasonal overlay;
cumulative.

The implementation may use:

Observable Plot for concise declarative charts;
D3 where lower-level control is useful.

The final choice may vary by chart.

Consistency of shared state matters more than using one chart library exclusively.


## 17. Derived Data

Derived fields such as:

week of year;
day of week;
weekday/weekend;
display units;

should be calculated in predictable locations.

Derived analytical outputs such as:

selection summaries;
cumulative series;
biweekly medians;

should generally be generated by the analytical layer rather than stored redundantly.


## 18. Weather

Weather fields should enter through the same normalization/enrichment boundary as other activity data.

Possible flow:

Strava Activity
      ↓
Normalization
      ↓
Optional weather enrichment
      ↓
Normalized Activity

Temperature/weather enrichment may be added later, separate from the active
normalized activity model.

If external historical weather enrichment is later added, it should remain separate from core Strava retrieval logic.

The MVP should not introduce a weather service unless the product value justifies the implementation cost.


## 19. Error Handling

The application should provide clear handling for:

Strava authentication failure;
token expiration/refresh failure;
rate-limit responses;
empty selections;
insufficient analytical data;
AI request failures;
tool failures;
malformed model suggestions.

The UI should degrade gracefully.

For example, the dashboard should remain usable manually if the AI request fails.


## 20. Validation

Structured model outputs that affect application state must be validated before use.

A model-generated AnalysisSuggestion should be checked against:

allowed view types;
allowed metrics;
valid numeric ranges;
supported grouping modes;
valid selection structure.

The model should never be trusted to emit arbitrary client state.


## 21. Testing Strategy

Testing should focus strongly on deterministic behavior.

Unit tests

Test:

normalization;
unit conversions;
derived date fields;
filters;
selection summaries;
cumulative calculations;
trend calculations;
relationship calculations;
comparison logic;
similarity logic;
sparse-data behavior.
Tool tests

Test:

tool input validation;
output shapes;
correct delegation to analytical functions;
edge cases.
State tests

Test:

applying filters;
switching view types;
applying View Suggestions;
preserving state across chat interactions.
Integration tests

Where practical, test:

Strava API boundary with mocked responses;
chat endpoint with mocked model/tool behavior.

Live API calls should not be required for the normal test suite.


## 22. AI Testing

The project should avoid relying exclusively on subjective prompt testing.

Deterministic pieces should be tested independently.

AI behavior may be evaluated using a small set of representative scenarios, such as:

broad "What stands out?" prompt;
user hypothesis not supported by data;
confounded speed comparison;
sparse selection;
follow-up reference such as "those activities";
View Suggestion generation.

These evaluations may initially be manual or lightweight.


## 23. CI

GitHub Actions should run on push and pull request.

At minimum:

install
→ typecheck
→ lint
→ test
→ build

CI should remain fast enough to support normal development.


## 24. Deployment

The public application should be deployed on Vercel.

This supports:

React/Vite frontend hosting;
server-side API routes/functions where appropriate;
Vercel AI SDK integration;
environment-secret management.

The deployed app should use environment variables for:

Strava client credentials;
model provider credentials;
any persistence configuration.

No secrets should be committed to the repository.


## 25. Public Repository

The repository should contain:

clear README;
architecture documentation;
product/UX documentation;
setup instructions;
test instructions;
environment-variable template;
public-safe demo data if needed.

It should not contain:

.env;
OAuth tokens;
raw private Strava exports;
precise private location data;
API secrets.


## 26. Demo Strategy

A portfolio reviewer should be able to understand the product without connecting a personal Strava account.

Possible approaches:

demo mode using synthetic/sanitized data;
deployed instance preloaded with safe demo data;
optional Strava connection for users who want their own data.

The exact approach can be chosen during implementation.

The project should not require a reviewer to create a Strava developer application.


## 27. Observability

The MVP should include lightweight observability appropriate to the project.

Useful logging may include:

Strava refresh failures;
API timing;
AI request timing;
tool calls;
tool failures;
invalid model outputs.

Logging should not expose:

tokens;
private activity payloads;
sensitive user-entered context.

A full production monitoring stack is not required.


## 28. Performance

The dataset size for a single athlete is expected to be manageable in browser memory.

The MVP may perform many filters and visual calculations client-side.

If performance becomes a problem, optimization should be based on measured behavior rather than anticipated scale.

Potential future optimizations include:

memoized selectors;
precomputed summaries;
server-side aggregation;
incremental refresh.


## 29. Security and Privacy

Private activity data should be handled conservatively.

The application should:

keep secrets server-side;
avoid public storage of raw private data;
sanitize demo fixtures;
avoid logging sensitive activity content;
validate server inputs;
validate model-generated state.

Location information should not be exposed unnecessarily.


## 30. Architectural Success Criteria

The architecture succeeds if:

UI and AI share the same typed analysis state;
analytical calculations are deterministic and reusable;
the model uses tools instead of inventing calculations;
Strava-specific code is isolated;
View Suggestions are structured and reversible;
the app remains manually usable without AI;
tests cover the important analytical behavior;
the system is simple enough for another developer to understand from the repository.
