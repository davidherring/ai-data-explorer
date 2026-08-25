# Interactive AI Data Explorer — AI Design

## 1. Purpose

The AI assistant is an analytical collaborator embedded inside the data-exploration workspace.

Its role is to help the user:

- understand the current selection;
- notice potentially interesting patterns;
- test hypotheses;
- identify weak or misleading comparisons;
- decide what to investigate next;
- request deterministic analysis through tools;
- propose useful visualization changes without taking control away from the user.

The assistant should feel aware of the analytical environment rather than behave like an isolated chatbot.

---

## 2. Core Design Principle

The language model should reason over structured analytical context rather than attempt to infer the current state from screenshots or raw UI output.

Each model request should be grounded in:

1. stable application instructions;
2. athlete dataset profile;
3. optional athlete-provided context;
4. prior conversational turns;
5. analytical state snapshots associated with those turns;
6. current user message;
7. current analytical state;
8. deterministic analytical summaries and tool outputs.

The model interprets analytical results.

Important numerical calculations should be performed by application code.

---

## 3. Context Layers

The assistant receives context in three main layers.

### 3.1 Athlete dataset profile

The dataset profile is a compact, automatically generated description of the connected athlete data.

Potential fields include:

- dataset date range;
- total activity count;
- available metrics;
- missing metrics;
- typical distance distribution;
- typical elevation distribution;
- recent activity volume;
- broad seasonal coverage;
- most recent data timestamp.

This profile should remain small enough to include in every model interaction.

Its purpose is orientation, not full analysis.

---

### 3.2 Optional athlete profile

The user may optionally provide short background information such as:

- goals;
- training background;
- upcoming events;
- preferences;
- known routine;
- topics of interest.

This context may help the assistant interpret questions more naturally.

It should never override the actual data.

For example, an athlete may say:

"I usually use Wednesdays for hill rides."

The assistant may use this as useful context, but should still verify whether the selected activities actually show higher elevation.

The optional profile is not required for MVP operation.

---

### 3.3 Current analysis snapshot

When the user submits a message, the application captures the current analytical state.

This snapshot describes what the user is looking at at the moment of the question.

Conceptually:

```ts
type AnalysisState = {
  selection: ActivitySelection;
  view: ViewConfiguration;
  grouping?: GroupingConfiguration;
};
```

The snapshot should include enough information to reproduce the current analysis.

Selection state uses explicit required `years`, `daysOfWeek`, and
`recurringDateRange` values. `years: []` and `daysOfWeek: []` intentionally
represent empty selections. Manual selection does not include `dayMode`;
weekday/weekend remains available only as a deterministic grouped-comparison
mode.

## 4. Conversation History

The application should retain the conversation transcript within the active chat.

Each conversational turn should include both visible text and relevant analytical context.

Conceptually:

User message
Analysis snapshot at submit time


Assistant response
Tool calls / tool results
Optional View Suggestion


Optional interaction event:
Suggestion accepted

The application does not need to record every slider or control change.

Only state associated with meaningful conversational interactions needs to enter the transcript.

## 5. Request Construction

Each model request should conceptually contain:

SYSTEM / APPLICATION INSTRUCTIONS

ATHLETE DATASET PROFILE

OPTIONAL ATHLETE PROFILE

PRIOR CONVERSATION
  User message
  Associated analysis snapshot

  Assistant response
  Tool results
  Optional suggestion
  Optional accepted-suggestion event

  ...


CURRENT TURN
  Current user message
  Current analysis snapshot
  Current selection summary

The exact representation may use Vercel AI SDK message parts, structured metadata, or another typed format.

The important requirement is that analytical state remains structured rather than being flattened into unstructured prose wherever possible.

## 6. State Snapshot Semantics

The assistant should know the current state when a user asks a question.

Example:

Selection:
2026
Wednesdays
10–30 miles
1200–1500 ft elevation

View:
Trend

Metric:
Average speed

Activity count:
10

This allows the user to ask:

"Does this look like I'm getting slower?"

without restating the active filters.

If the user later changes the dashboard manually and asks another question, the new request receives the new state.

The assistant does not need a continuous feed of intermediate dashboard changes.

## 7. Conversational References

Prior analytical snapshots should allow natural follow-up language.

Examples:

"those activities"
"same thing but last year"
"what about elevation?"
"now just compare weekends"
"does that explain it?"
"show me the recent ones"

The model should use conversation history and current state together to resolve these references.

When ambiguity remains, the assistant should ask rather than invent an interpretation.

## 8. Deterministic Analysis Principle

The LLM should not perform important calculations directly from large arrays of activity records.

The application should provide deterministic tools for:

filtering;
aggregation;
summary statistics;
trend calculations;
selection comparisons;
relationships between metrics;
identifying similar activities;
recent-vs-historical analysis.

This improves:

numerical reliability;
testability;
reproducibility;
observability;
prompt efficiency;
separation of responsibilities.

## 9. Initial Analysis Tools

The MVP tool layer should include a small set of broadly useful analytical capabilities.

### 9.1 summarizeSelection

Purpose:

Return a compact statistical description of an activity selection.

Possible output:

```ts
type SelectionSummary = {
  activityCount: number;
  dateRange: DateRange;
  averageSpeed?: number;
  medianSpeed?: number;
  averageDistance?: number;
  medianDistance?: number;
  averageElevation?: number;
  medianElevation?: number;
  totalDistance?: number;
  totalElevation?: number;
};
```

The exact fields should depend on metric availability.

### 9.2 compareSelections

Purpose:

Compare two arbitrary selections.

The comparison should not be limited to time periods.

Possible outputs include:

activity counts;
mean/median differences;
percent differences where meaningful;
distribution summaries;
major differences in activity composition.

### 9.3 calculateTrend

Purpose:

Measure how a metric changes over time within a selection.

Potential outputs:

direction;
magnitude;
time window;
sample count;
regression or smoothed trend information;
warnings when the sample is sparse.

The tool should avoid presenting unstable trends as authoritative.

### 9.4 relationshipBetweenMetrics

Purpose:

Describe the relationship between two numerical variables.

Examples:

elevation vs. speed;
distance vs. speed;
moving time vs. speed.

Potential output:

correlation or another appropriate relationship statistic;
sample count;
range information;
possible clusters/outliers;
warnings about causal interpretation.

### 9.5 findSimilarActivities

Purpose:

Find activities similar to a target activity or current selection.

Similarity may initially use dimensions such as:

distance;
elevation;
date/season;
day type.

The MVP should avoid complex route matching unless it becomes easy to support.

### 9.6 summarizeRecentVsHistorical

Purpose:

Compare a recent window with a relevant historical baseline.

Example:

last 6 weeks of weekday 10–30 mile activities;
same seasonal period across previous years.

This tool can support recent-trend analysis and potential experiment suggestions.

## 10. Tool Design Rules

Tools should:

accept typed inputs;
return structured outputs;
avoid unnecessary natural-language prose;
expose sample sizes;
surface missing-data conditions;
include warnings when an analysis is statistically weak;
be independently testable without invoking the model.

The model should convert structured tool output into conversational explanation.

## 11. Proactive Exploration

When the user asks a broad question such as:

"What stands out?"

the assistant may explore the current selection or athlete profile and surface 2–3 potentially interesting observations.

The assistant should prioritize observations that:

differ meaningfully from a relevant baseline;
suggest a plausible next analytical step;
can be supported by deterministic calculations;
expose a possible confounder;
challenge a user's hypothesis when appropriate.

The assistant should not generate an exhaustive list of every measurable difference.

## 12. Hypothesis Testing

The assistant should treat user hypotheses as questions to test rather than assumptions to confirm.

Example:

User:

"I think I'm starting my season later and that's why I'm slower."

Appropriate behavior:

inspect cumulative or seasonal volume;
compare relevant years;
determine whether the data supports the later-start hypothesis;
communicate uncertainty;
suggest another line of inquiry if the hypothesis looks weak.

The assistant should be willing to say:

"The cumulative mileage data does not show a clear later start, so that explanation appears weaker."

## 13. Observations vs. Explanations

The assistant should distinguish:

Observation

"Recent activities in this selection have lower average speed."

Contextual relationship

"Those activities also have higher elevation."

Hypothesis

"Route difficulty could be contributing to the speed difference."

Unsupported causal claim

"Higher elevation caused the slowdown."

The assistant should not collapse these levels into one statement.

## 14. View Suggestions

The assistant may optionally propose a dashboard state change.

A suggestion should be used when a visual or selection change would materially help answer the current question.

The model supplies a constrained patch, not a complete dashboard state.
The server validates the patch against the submitted `AnalysisState` and returns
only validated suggestion data. The executable patch is retained for Apply;
`changes` is display-only and should not be used to reconstruct behavior.

Conceptually:

```ts
type AnalysisSuggestion = {
  id: string;
  label: string;
  rationale?: string;
  patch: ViewSuggestionPatch;
  changes: ViewSuggestionChange[];
};
```

View Suggestions support patches for view metrics and these selection fields:
`years`, `daysOfWeek`, `dateRange`, `recurringDateRange`, `distanceMiles`,
`elevationGainFeet`, and `sportType`. Required selection fields are supplied as
explicit values: clear years with `years: []`, clear days with
`daysOfWeek: []`, and reset the Seasonal window with `01-01` through `12-31`.

It does not support `comparison`, `grouping`, or arbitrary query expressions.

The visible interface renders:

View Suggestion with Apply and Dismiss controls.

The current dashboard should remain unchanged until the user accepts.
Suggestions are optional and do not replace deterministic tools for numerical
claims.

## 15. Suggestion Acceptance

When the user selects View Suggestion:

the validated patch is applied to the current `AnalysisState`;
unrelated current state is preserved;
the dashboard updates.

No old complete `proposedState` is installed, and Apply is not controlled by a
full-state fingerprint stale gate. If the user manually changed fields that are
not included in the suggestion patch, those changes remain. If the patch includes
a field the user also changed manually, the explicit suggestion value replaces
the current value for that field.

View Suggestion cards have four lifecycle states:

pending;
applied;
dismissed;
ignored.

Ordinary manual view/filter exploration preserves pending suggestions. A later
manual user message marks still-pending suggestions ignored before the request
is sent. Source/data-context identity changes also invalidate pending
suggestions by marking them ignored. Applied and dismissed cards remain visible
as conversation history.

After Apply, the client waits until the updated current `AnalysisState` and
selected activities are reflected in props, then sends one hidden automatic
follow-up request. This request includes compact applied-suggestion context
stating that the user just accepted the change. It does not add a visible
synthetic user message, and the hidden trigger is stripped before conversion to
model messages.

Conceptually:

```ts
type AppliedViewSuggestionContext = {
  trigger: 'automatic-post-apply-analysis';
  label: string;
  changes: ViewSuggestionChange[];
};
```

Current `AnalysisState` and `selectedActivities` remain authoritative for the
automatic follow-up. Prior assistant tool parts continue to be stripped from
model-visible history so old selection-sensitive results do not masquerade as
current evidence.

## 15.1 Markdown Rendering

Assistant Markdown supports paragraphs, emphasis, lists, inline code, safe
links, and GFM tables. Tables render semantically and scroll horizontally within
the assistant message when wide.

User messages remain plain text. Raw HTML is not enabled. Link handling remains
restricted to approved safe schemes and protected link attributes.

## 15.2 Request Size And Public Endpoint Posture

Current `/api/chat` request measurements:

- about 100 selected activities: 33 KiB;
- 500: 161 KiB;
- 1000: 320 KiB;
- 1500: 479 KiB;
- 2000: 638 KiB;
- about 1000 plus representative message history: 328 KiB.

`selectedActivities` dominate request size. The current 2000 selected-activity
cap and 3 MB request-body guard remain in place. Current evidence does not
justify broader transport architecture yet.

`/api/chat` is public, strictly validates request shape, and enforces size/count
guards. This is not a claim that the endpoint is abuse-proof. Sprint 14 keeps a
document-and-observe public-usage posture rather than adding new authentication
or rate-limit infrastructure.

Normal visitors start from the bundled demo source. That fixture contains 1000
sanitized normalized activities, with original IDs replaced by demo IDs and no
raw/private/location Strava data bundled. Users may still connect their own
Strava account through OAuth.

## 16. Suggestions Are Optional

Not every assistant response should contain an action.

The AI may simply:

answer;
explain;
ask a question;
identify uncertainty;
propose another interpretation;
continue the dialogue.

The assistant should not feel like a wizard that always tries to move the interface.

## 17. Initial Assistant Behavior

When a chat begins, the assistant should already understand the dataset profile.

It may offer a small number of useful starting paths.

Examples:

recent vs. historical trends;
seasonal differences;
relationships between available metrics;
cumulative volume;
unusual recent activity.

These should be generated from the actual available dataset rather than presented as a permanent fixed menu.

## 18. Recent-Trend Collaboration

Because Strava data updates over time, the assistant may use recent activities to suggest potential investigations.

Example:

"Your recent high-elevation activities are slower than comparable activities from earlier in the season, while weekly volume has also increased."

Possible follow-up:

"One useful experiment would be to compare performance on a lower-elevation activity similar to your earlier weekday activities."

Such suggestions should be framed as exploratory experiments rather than training prescriptions.

## 19. Weather Context

Temperature and other weather variables are not active Sprint 10 metrics. If
future weather enrichment adds them, the assistant may use them as contextual
analytical dimensions.

Example:

"Today's ride was faster than your recent comparable hill rides, and the starting temperature was substantially cooler."

Appropriate interpretation:

"Temperature may be worth investigating."

Inappropriate interpretation:

"The cooler temperature caused the faster ride."

## 20. Missing Data

The assistant should understand which metrics are unavailable.

For example, if the athlete does not collect:

heart rate;
power;

the assistant should not repeatedly recommend analyses that depend on those fields.

The athlete dataset profile should expose metric availability.

## 21. Context Growth

The MVP may resend the full active chat history on each request.

A New Chat action provides a simple way to reset context.

Long-term strategies such as:

summarizing older turns;
pruning low-value tool results;
saving named conversations;

may be added later if needed.

Context optimization should not complicate the initial implementation unnecessarily.

## 22. Safety and Domain Boundaries

The assistant may help users explore training data.

It should not present itself as:

a physician;
a diagnostic system;
an authoritative coach.

It may identify patterns and suggest analytical experiments.

It should avoid medical conclusions and strong physiological claims based on incomplete activity data.

## 23. MVP Success Condition

The AI component succeeds if a user can:

manipulate the dataset manually;
ask a question about the active view;
receive an answer grounded in the active state;
continue with natural references to prior analysis;
receive useful deterministic analytical results;
occasionally receive a relevant View Suggestion;
apply that suggestion without losing conversational continuity;
use the conversation to discover an analytical path they had not explicitly planned in advance.

The goal is not maximum agent autonomy.

The goal is useful shared analytical reasoning.
