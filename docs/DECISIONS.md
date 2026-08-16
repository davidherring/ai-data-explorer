# Interactive AI Data Explorer — Decision Log

This document records important product and technical decisions made during discovery and implementation.

It is not intended to capture every minor choice.

Decisions should be added when:

- multiple plausible approaches existed;
- the choice affects architecture or product behavior;
- future developers may reasonably wonder why the project was built this way.

---

## D001 — Use Strava as the MVP domain

### Decision

Build the initial AI data explorer around Strava cycling data rather than creating a general-purpose data exploration platform.

### Rationale

Strava provides:

- real historical data;
- continuously updating data;
- OAuth/API integration;
- meaningful numerical dimensions;
- a concrete user workflow.

The project is intended to validate an AI-assisted data exploration interaction model.

Generalizing the product before validating that model would add substantial complexity without proving additional value.

### Consequence

The MVP may contain Strava-specific concepts where appropriate.

Future generalization should emerge from successful use of the interaction model rather than be designed speculatively.

---

## D002 — Treat athlete habits as examples, not schema

### Decision

Do not hard-code ride categories based on one athlete's routine.

### Rationale

Discovery work used examples such as:

- Wednesday hill rides;
- weekday shorter rides;
- weekend long rides.

Other athletes may have completely different patterns.

### Consequence

The core abstraction is a flexible activity selection built from reusable filters such as:

- date;
- day;
- distance;
- elevation;
- activity type.

Named categories may later be implemented as saved selections.

---

## D003 — Single selection is the default

### Decision

The analysis model should not require comparison.

### Rationale

Many useful questions concern one cohort:

- "What happened to my hill rides this year?"
- "How has speed changed since June?"
- "What does this distribution look like?"

Making comparison mandatory would unnecessarily constrain exploration.

### Consequence

The application has:

- one primary selection;
- an optional second selection when comparison is useful.

---

## D004 — Use a small set of flexible visualizations

### Decision

The MVP will focus on a small number of reusable views rather than a large visualization catalog.

Validated views from discovery include:

- trend over time;
- relationship/scatter;
- seasonal overlay;
- cumulative value.

### Rationale

These views supported multiple different questions during exploratory work.

The project benefits more from shared, flexible analytical state than from adding many specialized charts.

### Consequence

New visualization types should only be added when they support a clearly unmet analytical need.

---

## D005 — Avoid ride-count-based rolling averages as the default trend

### Decision

Do not use a fixed trailing-N-rides average as the primary trend representation.

### Rationale

A fixed ride count may represent very different calendar durations depending on riding frequency.

It can also create misleading continuity across gaps.

### Consequence

Trend analysis should prefer calendar-based aggregation or smoothing when appropriate.

Sparse selections may be shown as individual observations instead.

---

## D006 — Treat sample density explicitly

### Decision

Dense and sparse selections should not always be visualized identically.

### Rationale

Discovery showed that narrow selections may contain too few observations for stable aggregation.

A trend line across very sparse data can imply structure that is not present.

### Consequence

Analytical functions should expose sample counts and data-quality information.

Visualization and AI layers may change behavior or surface warnings based on sample size.

---

## D007 — Elevation is a first-class analytical dimension

### Decision

Elevation gain should be available as both a filter and an analytical metric.

### Rationale

Discovery showed that apparent speed decline could be substantially confounded by changes in ride elevation.

Broad comparisons can therefore be misleading when ride composition changes.

### Consequence

Elevation participates in:

- filtering;
- summaries;
- comparisons;
- relationships;
- ride similarity;
- AI reasoning.

---

## D008 — Do not invent an elevation-adjusted speed metric

### Decision

The MVP will not create a custom formula intended to normalize speed for elevation.

### Rationale

Such a metric would require a defensible physiological or empirical model.

Inventing one for convenience would create false precision.

### Consequence

The application controls for elevation through:

- filtering;
- comparison;
- relationship analysis.

---

## D009 — Use cumulative volume to test timing hypotheses

### Decision

Support cumulative distance over seasonal/calendar position.

### Rationale

Discovery showed that cumulative mileage can directly challenge hypotheses such as:

"I started training later this year."

The view provides useful information without requiring a performance metric.

### Consequence

Cumulative views should operate on the current selection so the same mechanism can examine:

- all rides;
- long rides;
- weekend rides;
- other cohorts.

---

## D010 — The AI shares application state

### Decision

The AI assistant should receive structured current analysis state with each user message.

### Rationale

The assistant needs to understand what the user is looking at without requiring repeated verbal descriptions.

### Consequence

The application maintains a typed `AnalysisState` used by both:

- visualization;
- AI context.

The assistant should not attempt to infer state from screenshots.

---

## D011 — Capture state at conversational turns, not every UI action

### Decision

Do not store every slider or control change in the conversation transcript.

Capture the analysis state when a user sends a message.

### Rationale

The AI needs the analytical context relevant to the conversation, not a complete replay of UI activity.

### Consequence

A conversation turn contains:

- user message;
- analysis snapshot;
- assistant response;
- relevant tool/suggestion data.

---

## D012 — Preserve conversational context

### Decision

Maintain prior user/assistant turns within the active chat.

### Rationale

Natural analytical conversation relies on references such as:

- "those rides";
- "same thing last year";
- "what about elevation?";
- "does that explain it?"

### Consequence

The MVP may resend the active transcript on each model request.

A New Chat action provides a simple context reset.

Long-term summarization/pruning may be added if needed.

---

## D013 — Include an athlete dataset profile

### Decision

Generate a compact profile describing the connected dataset and include it in AI context.

### Rationale

The assistant should have some baseline understanding of:

- what data exists;
- how much history is available;
- which metrics are available;
- broad dataset characteristics.

This should make initial interactions more informed.

### Consequence

The profile should be generated deterministically and remain small enough to include repeatedly.

---

## D014 — Allow optional athlete-entered context

### Decision

The design may include a short optional athlete bio/profile.

### Rationale

Information such as goals or training background can make conversation more natural.

However, the app should not require such context.

### Consequence

User-entered context supplements rather than overrides data-derived evidence.

This may be deferred if needed for MVP timing.

---

## D015 — Use deterministic analysis tools

### Decision

Important analytical calculations should be implemented in code and exposed to the model as tools.

### Rationale

LLMs should not be relied on to accurately calculate statistics from large raw activity arrays.

Deterministic tools provide:

- reliability;
- testability;
- reproducibility;
- smaller prompts;
- clearer debugging.

### Consequence

Initial tools may include:

- `summarizeSelection`
- `compareSelections`
- `calculateTrend`
- `relationshipBetweenMetrics`
- `findSimilarRides`
- `summarizeRecentVsHistorical`

---

## D016 — The AI interprets rather than calculates

### Decision

The LLM's primary role is interpretation, conversational reasoning, and selecting useful analytical actions.

### Rationale

The model is better suited to:

- explaining;
- connecting observations;
- recognizing possible confounders;
- suggesting next questions.

The analytical layer is better suited to numerical calculation.

### Consequence

Important numerical claims should be grounded in deterministic tool results.

---

## D017 — The AI should challenge weak hypotheses

### Decision

The assistant should not default to confirming the user's proposed explanation.

### Rationale

The application is intended as an analytical collaborator.

Useful collaboration includes finding evidence that weakens a hypothesis.

### Consequence

The assistant should be comfortable saying that available data does not support a proposed explanation and suggesting another line of inquiry.

---

## D018 — Separate observation from causation

### Decision

The assistant should distinguish:

- observation;
- relationship;
- hypothesis;
- causal claim.

### Rationale

Activity data contains many confounders and incomplete measures.

### Consequence

The AI may say:

"Speed is lower and elevation is higher."

It may suggest:

"Elevation could be contributing."

It should not automatically conclude:

"Elevation caused the slowdown."

---

## D019 — Suggestions are non-destructive

### Decision

AI-proposed dashboard changes should not be applied automatically.

### Rationale

The user may:

- disagree;
- want to finish reading;
- want to investigate something else;
- prefer manual control.

### Consequence

The assistant may return a structured View Suggestion.

The UI applies it only after explicit user action.

---

## D020 — Not every AI response needs a View Suggestion

### Decision

Suggestions are optional.

### Rationale

The assistant is intended to participate in ongoing dialogue, not behave like a step-by-step wizard.

### Consequence

Many responses may contain only:

- explanation;
- uncertainty;
- a question;
- an observation.

---

## D021 — Record accepted View Suggestions in conversation context

### Decision

When the user applies an AI suggestion, record that event.

### Rationale

The assistant should be able to distinguish between:

- a suggestion it made;
- a suggestion the user actually accepted.

This also improves debugging and conversation restoration.

### Consequence

Suggestion acceptance becomes part of the structured conversation history.

---

## D022 — Surface a small number of proactive observations

### Decision

When appropriate, the assistant may surface approximately 2–3 potentially interesting findings.

### Rationale

One of the project's goals is helping users discover analytical paths they did not already know to ask about.

An exhaustive list would be noisy and difficult to evaluate.

### Consequence

The assistant should prioritize a small number of grounded, potentially actionable observations.

---

## D023 — Do not hard-code an insight checklist

### Decision

The assistant should not simply cycle through fixed questions such as:

- speed trend;
- elevation relationship;
- cumulative mileage.

### Rationale

Those questions were useful during discovery, but the intended product is an exploratory environment.

### Consequence

Capabilities should be implemented as reusable tools and analysis primitives.

The AI decides which are relevant based on available data and user context.

---

## D024 — Support recent-vs-historical analysis

### Decision

Recent activity should be analyzable against relevant historical baselines.

### Rationale

Strava data continues to update.

This creates an opportunity for the assistant to notice recent changes and help the user develop follow-up experiments.

### Consequence

The analytical tool layer should support recent-window comparisons.

The assistant may suggest experiments, but should avoid authoritative training prescriptions.

---

## D025 — Treat temperature as potentially useful context

### Decision

Temperature should be supported if available without disproportionate implementation cost.

### Rationale

Starting temperature may help explain or motivate exploration of performance differences.

### Consequence

Temperature may participate in:

- filtering;
- relationships;
- AI reasoning.

It should be treated as contextual rather than causal evidence.

---

## D026 — Treat wind cautiously

### Decision

Wind should not be a central MVP analytical variable.

### Rationale

A single wind value poorly represents conditions across rides that:

- change direction;
- last multiple hours;
- experience changing weather.

### Consequence

Wind may be included if easily available, but should not drive core product design.

---

## D027 — Do not assume heart-rate or power availability

### Decision

The application must work well without heart-rate or power data.

### Rationale

Many athletes do not collect these metrics.

The product should not be designed around one athlete's sensor setup.

### Consequence

Metric availability should be represented explicitly.

The AI should not repeatedly recommend analyses using unavailable metrics.

---

## D028 — Use Vercel AI SDK for the MVP AI layer

### Decision

Use Vercel AI SDK for model integration and tool-enabled conversational UI.

### Rationale

It directly supports the required behavior:

- tool calling;
- structured outputs;
- streaming;
- UI messages;
- generative interaction patterns.

### Consequence

The project gains practical experience with the Vercel AI ecosystem while avoiding unnecessary agent infrastructure.

---

## D029 — Keep the agent architecture simple

### Decision

Use direct application tools rather than adding additional agent/protocol layers during MVP development.

### Rationale

The current application has one primary AI consumer and a small analytical tool set.

Additional infrastructure would increase complexity without solving a demonstrated problem.

### Consequence

The MVP architecture is:

```text
AI SDK
  ↓
typed analytical tools
  ↓
deterministic analytical functions
```

Future interoperability layers may be considered if the project grows.


## D030 — Use the repository as durable project context

### Decision

Durable product and architecture knowledge should live in repository documentation rather than depend on chat history.

### Rationale

AI-assisted development works better when implementation agents can inspect a stable source of truth.

### Consequence

Key documentation includes:

PRODUCT.md
UX.md
AI-DESIGN.md
DATA-MODEL.md
ARCHITECTURE.md
DECISIONS.md
AGENTS.md


## D031 — Keep AGENTS.md operational

### Decision

AGENTS.md should not become a duplicate giant specification.

### Rationale

Product intent and architecture belong in dedicated documents.

The agent instruction file should help coding agents operate effectively inside the repository.

### Consequence

AGENTS.md should point to durable docs and contain concise implementation/testing rules.

## D032 — Public repo from early implementation

### Decision

The production project should be maintained as a public repository once implementation begins.

### Rationale

Public code is part of the project's portfolio value.

It also encourages:

clean setup;
safe handling of secrets;
readable history;
useful documentation.
Consequence

Private activity exports and credentials must never enter repository history.


## D033 — Prefer a demo mode for portfolio access

### Decision

The deployed portfolio should be understandable without requiring reviewers to connect their own Strava accounts.

### Rationale

OAuth setup creates unnecessary friction for a portfolio reviewer.

### Consequence

The app should likely include synthetic or sanitized demonstration data alongside optional real Strava connection.

The exact implementation can be decided during development.

## D034 — Prioritize finishing the proof of concept

### Decision

Architecture and features should be judged partly by whether they help deliver a polished MVP quickly.

### Rationale

This project is intended to validate the AI-collaboration concept and serve as a portfolio piece.

An unfinished generalized platform would provide less value than a focused, deployed Strava application.

### Consequence

When choosing between:

a simple implementation that proves the interaction;
a more sophisticated implementation that mainly increases infrastructure;

prefer the simpler implementation unless the extra complexity solves a demonstrated product problem.