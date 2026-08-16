# AGENTS.md

## Purpose

This repository contains the Interactive AI Data Explorer, a Strava-based proof of concept for embedding an AI collaborator into an interactive data-visualization environment.

Coding agents should optimize for:

- product correctness;
- clear typed interfaces;
- deterministic analytical behavior;
- small, reviewable changes;
- automated verification;
- preserving the user-controlled AI interaction model.

Do not treat this file as the full product specification.

Before making substantial changes, read the relevant project documents.

---

## Source of Truth

Use these documents for product and technical intent:

- `PRODUCT.md` — product goals, MVP scope, success criteria
- `UX.md` — workspace behavior, visualization interactions, AI UX
- `AI-DESIGN.md` — model context, transcript behavior, tools, suggestions
- `DATA-MODEL.md` — normalized ride model and analytical data structures
- `ARCHITECTURE.md` — system boundaries, state flow, testing, deployment
- `DECISIONS.md` — important architectural and product decisions

If implementation choices conflict with these documents, do not silently choose a different direction.

Call out the conflict and propose the smallest appropriate resolution.

---

## Core Product Model

The application is not a dashboard with an unrelated chatbot.

The visualization workspace and AI assistant share the same typed analytical state.

The primary model is:

```text
Strava data
    ↓
normalization
    ↓
typed ride data
    ↓
deterministic analytical layer
    ↓
shared AnalysisState
   /             \
  v               v
visualization     AI tools
                      ↓
                 AI assistant
```

The user remains in control of analysis state.

AI suggestions are optional and non-destructive.

## Implementation Priorities

Prefer this order of concern:

correctness;
clear product behavior;
maintainable typed interfaces;
testability;
simplicity;
performance optimization only when justified by measured behavior.

Do not introduce abstractions solely because they may be useful later.

Do not generalize beyond the current product requirements without a concrete need.

## Analysis State

Maintain one shared typed AnalysisState.

It should drive:

filters;
selected activities;
visualization configuration;
deterministic summaries;
AI context;
proposed View Suggestions.

Do not create separate incompatible state models for the UI and AI.

Do not hide important analytical state inside visualization components.

## Analytical Logic

Important calculations must be deterministic.

Examples include:

filtering;
summary statistics;
aggregation;
comparisons;
trends;
metric relationships;
cumulative values;
ride similarity;
recent-vs-historical summaries.

The language model should interpret these calculations rather than perform them from raw ride arrays.

Analytical functions should be:

typed;
pure where practical;
independently testable;
reusable by both UI and AI tool layers.
AI Tools

AI tools should be thin wrappers around deterministic analytical functions.

Initial capabilities include:

summarizeSelection
compareSelections
calculateTrend
relationshipBetweenMetrics
findSimilarRides
summarizeRecentVsHistorical

Tool inputs and outputs must be structured and validated.

Do not bury core analysis logic inside tool handlers.

## AI Behavior

The assistant should receive:

application instructions;
athlete dataset profile;
optional athlete-entered context;
conversation history;
prior analytical snapshots where relevant;
current user message;
current AnalysisState;
deterministic selection summary.

The assistant may:

answer analytical questions;
surface a small number of interesting observations;
identify confounders;
challenge unsupported hypotheses;
call deterministic tools;
propose a View Suggestion.

The assistant should distinguish:

observation;
relationship;
hypothesis;
causal claim.

Avoid unsupported causal or physiological conclusions.

## Conversation State

Capture analytical state when the user sends a message.

Do not record every intermediate UI interaction.

A conversational turn may include:

User message
Analysis snapshot


Assistant response
Tool calls/results
Optional View Suggestion


Optional suggestion-accepted event

Maintain conversational continuity for references such as:

"those rides"
"same thing last year"
"what about elevation?"
"does that explain it?"
View Suggestions

The model must not directly mutate application state.

A suggestion should return a validated structured state, for example:

type AnalysisSuggestion = {
  id: string;
  label: string;
  proposedState: AnalysisState;
};

The frontend renders a user-controlled View Suggestion action.

Only apply the proposed state after explicit user acceptance.

Record accepted suggestions in conversation context.

Not every assistant response should include a suggestion.

## Visualization

The initial analytical views are:

trend;
relationship/scatter;
seasonal overlay;
cumulative.

Use D3 and/or Observable Plot as appropriate.

Do not duplicate filtering or analytical logic inside chart implementations.

Charts should consume:

normalized ride data;
shared analysis state;
deterministic analytical outputs.

Treat sparse data carefully.

Do not imply stable trends where sample sizes are inadequate.

## Data

Raw Strava API objects are not the application domain model.

Normalize API responses before analytical use.

Keep private and location-sensitive data out of public fixtures and repository history.

Never commit:

.env;
Strava tokens;
client secrets;
model API keys;
private raw activity exports;
precise route/location data.

Use synthetic or sanitized data for public demos and automated tests.

## External APIs

Keep secrets server-side.

Mock external boundaries in normal automated tests.

Normal test runs should not require:

live Strava API access;
live model calls.

Handle API failures explicitly.

The manual visualization experience should continue to function if AI requests fail.

## Validation

Validate all external and model-generated inputs before using them.

Especially validate:

API payloads where appropriate;
tool inputs;
View Suggestions;
supported metrics;
supported view types;
selection ranges;
grouping and aggregation modes.

Never trust model output as arbitrary client state.

## Testing

Every substantial behavioral change should include or update relevant tests.

Prioritize tests for:

normalization;
date-derived fields;
unit conversion;
filtering;
summaries;
aggregation;
cumulative calculations;
trends;
comparisons;
relationships;
sparse-data handling;
tool behavior;
View Suggestion application;
shared state transitions.

Before declaring work complete, run the relevant verification commands.

The project CI target is:

install
→ typecheck
→ lint
→ test
→ build

Do not report success if required checks are failing.

## Working Style

Before implementation:

inspect the relevant files;
read the relevant design docs;
identify the smallest coherent change;
state the implementation plan if the work is non-trivial.

During implementation:

preserve existing working behavior unless the task requires changing it;
avoid unrelated refactors;
prefer incremental changes;
keep types explicit;
keep functions focused;
add dependencies only when they solve a concrete problem.

After implementation:

run tests/typecheck/lint/build as appropriate;
fix failures introduced by the change;
summarize what changed;
identify any unresolved issue or deviation from the design docs.
Scope Discipline

This project is intended to become a polished, deployed proof of concept quickly.

When two approaches satisfy the requirement, prefer the one that:

has fewer moving parts;
is easier to test;
is easier to explain;
preserves future flexibility without implementing speculative infrastructure.

Do not confuse architectural sophistication with product quality.

## Decision Changes

If implementation reveals that an existing product or architecture decision is wrong:

do not work around it silently;
explain the issue;
propose a revised decision;
update DECISIONS.md and any affected design document when the change is accepted.

The repository documentation should stay aligned with the implementation.