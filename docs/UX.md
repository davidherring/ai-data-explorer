# Interactive AI Data Explorer — UX

## 1. UX Goal

The interface should feel like a shared analytical workspace between the athlete and the AI assistant.

The user should be able to:

- manipulate the data directly;
- see the effect immediately;
- ask questions about the current view;
- receive grounded observations;
- follow suggested analytical paths;
- continue the conversation without repeatedly restating context.

The AI should feel integrated into the analysis environment rather than placed beside it.

---

## 2. Primary Workspace

The main application should contain two coordinated areas:

1. the analysis workspace;
2. the AI conversation panel.

A conceptual layout:

```text
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │                      │
│              VISUALIZATION                  │    AI ASSISTANT      │
│                                             │                      │
│                                             │                      │
├─────────────────────────────────────────────┤                      │
│                                             │                      │
│      SELECTION / ANALYSIS CONTROLS          │                      │
│                                             │                      │
├─────────────────────────────────────────────┴──────────────────────┤
│          optional summary / status information                     │
└────────────────────────────────────────────────────────────────────┘

Exact layout may change during implementation.

The important requirement is that the visualization, controls, and AI conversation feel like parts of one analytical environment.

## 3. Activity Selection

The user should be able to create a single active selection using direct controls.

Current primary controls are:

years;
activity type.

Additional filters live in collapsed-by-default More Filters:

specific days of week;
absolute date range;
Seasonal window;
minimum and maximum distance;
minimum and maximum elevation.

Manual day selection uses explicit `daysOfWeek` only. There is no manual
weekday/weekend selector; weekday/weekend remains available as deterministic
grouped-comparison output.

The user should not be required to understand a predefined activity taxonomy.

When activity data first loads, all available years are selected. Clearing all
years intentionally produces an empty selection.

Changing data sources initializes the year selection from the new source.
Refreshing the same source preserves narrowed year selections unless the prior
selection represented every previously available year.

For example, an athlete may construct a practical "weekday activity" population through:

weekdays;
10–30 miles;
any elevation.

Another athlete may use completely different filters.

## 4. Single-selection first

The normal state of the application contains one active selection.

Example:

2026
Wednesdays
10–30 miles
1200–1500 ft elevation

The user can explore that selection without creating a second group.

Comparison is an optional action layered on top of the basic selection model.

## 5. Comparison mode

When useful, the user or AI may create a second selection for comparison.

Example:

Selection A
2026
Wednesdays
1200–1500 ft


Selection B
2023–2025
Wednesdays
1200–1500 ft

The comparison model should reuse the same selection primitives.

Comparison should not require a separate set of hard-coded screens.

## 6. Visualization modes

The user should be able to switch among a small number of analytical views.

### 6.1 Trend

Purpose:

Show how a selected metric changes over calendar time.

Initial behavior:

individual activities visible where appropriate;
optional smoothing or aggregation for dense selections;
sparse selections should avoid misleading trend lines.

Potential metrics include:

average speed;
distance;
elevation;
duration.

### 6.2 Relationship

Purpose:

Explore relationships between two numerical dimensions.

Example:

x = elevation gain;
y = average speed.

This view should help identify:

confounders;
clusters;
unusual activities;
shifts in activity composition.

Potential optional encodings include:

year;
month;
other grouping values.

### 6.3 Seasonal overlay

Purpose:

Compare equivalent positions within multiple years.

The x-axis represents a seasonal/calendar position such as week of year.

Years are treated as discrete groups.

For dense selections, the view may aggregate into weekly or biweekly summaries.

Low-sample aggregates should be visually de-emphasized.

### 6.4 Cumulative

Purpose:

Show accumulated values across a season or year.

Example:

cumulative mileage by week of year.

The view should work with any active selection.

For example:

all activities;
activities over 30 miles;
weekend activities;
another user-defined cohort.

## 7. Adaptive visualization behavior

The visualization should not imply more certainty than the data supports.

Examples:

dense selections may support aggregation or smoothing;
sparse selections may be better represented as individual observations;
low-sample aggregate buckets should be visually de-emphasized;
gaps should not be presented as meaningful continuous trends.

The UX may later surface warnings or recommendations when a selected view is poorly matched to the available data.

## 8. Current Analysis State

At all times, the application should maintain a typed representation of the current analytical state.

Conceptually:

Selection
- activity type
- explicit years
- optional absolute date range
- explicit recurring Seasonal window
- explicit days of week
- distance range
- elevation range

View
- trend
- relationship
- seasonal
- cumulative

Metrics
- x metric
- y metric
- cumulative metric where relevant

Grouping / encoding
- none
- year
- month

Seasonal and Cumulative fixed view behavior
- biweekly median Seasonal aggregation
- continuous Cumulative accumulation

This state drives both the visualization and the AI context.

Chart cards separate the analytical heading, View controls, view-specific Metric
controls, selection summary, and visualization. The selection summary should not
compete with chart controls for header space.

## 9. Manual interaction

The user should always be able to operate the workspace without AI.

Changes made through controls should immediately update:

the selection;
the visualization;
deterministic selection summaries.

The AI does not need to receive every intermediate control change.

The current state is captured when the user sends a message.

## 10. AI conversation behavior

When the user submits a message, the assistant receives:

the user message;
the current analysis-state snapshot;
current deterministic selection summaries;
athlete dataset profile;
relevant prior conversation.

This allows natural exchanges such as:

User:
"Why does this look slower?"

Assistant:
"Recent activities in this selection are slower, but they also contain substantially more elevation than the historical activities. I would be cautious about comparing average speed directly."

User:
"What about similar-elevation activities?"

The assistant should understand the conversational reference without requiring the user to restate the full selection.

## 11. Proactive observations

When appropriate, the assistant may surface 2–3 potentially interesting observations.

Examples:

a recent trend differs from historical behavior;
a comparison group contains substantially different elevation;
cumulative volume does not support a user's hypothesis;
the current selection is too sparse for a stable trend;
another metric may provide useful context.

Observations should be framed as analytical leads rather than definitive conclusions.

## 12. View Suggestion interaction

The assistant may optionally attach a suggested dashboard change to a response.

Example:

Assistant:

"Your 2026 Wednesday activities contain substantially more elevation than earlier years. A speed-versus-elevation view would help test whether activity difficulty explains the difference."

[View Suggestion]
Apply
Dismiss

The button should not interrupt the user's reading or automatically change the workspace.

If the user chooses the suggestion:

the validated suggestion patch is applied to the current analysis state;
unrelated current view/filter state is preserved;
the visualization updates.

Manual view/filter exploration does not invalidate a pending suggestion. If the
user later sends a manual chat message, still-pending suggestions are marked
ignored before that request is sent. If the underlying source/data context
changes, pending suggestions are also marked ignored.

The user may ignore the suggestion and continue the conversation instead.

## 13. AI suggestion structure

A suggestion should contain enough structured information to apply a constrained
change to the current state.

Conceptually:

type AnalysisSuggestion = {
  id: string;
  label: string;
  rationale?: string;
  patch: ViewSuggestionPatch;
  changes: ViewSuggestionChange[];
};

The visible UI should show:

View Suggestion
Apply
Dismiss

The `patch` is executable and validated. `changes` is display-only and should
not be used to reconstruct behavior. No old complete `proposedState` is
installed, and Apply is not controlled by a full-state fingerprint stale gate.

Cards can be pending, applied, dismissed, or ignored. Applied, dismissed, and
ignored cards remain in the transcript as historical context with their original
label, rationale, and changes, but no action buttons.

The first version supports constrained view metric changes and selected activity
filters. Required selection fields such as `years`, `daysOfWeek`, and
`recurringDateRange` are proposed with explicit values. It does not support
comparison mode, grouping, or arbitrary query language.

## 14. Conversation transcript

The visible transcript contains normal user and assistant messages.

Internally, each conversational turn should also retain relevant analytical context.

A turn may include:

User message
Analysis-state snapshot


Assistant response
Tool results
Optional analysis suggestion

Dashboard changes made between messages do not need to be stored as transcript
events. Apply/Dismiss actions update local UI state but do not create visible
synthetic transcript messages.

After Apply, the app automatically continues analysis once the updated current
state and selected activities are available. This automatic follow-up is sent
with a hidden internal trigger and compact context saying the user just accepted
the suggestion. The hidden trigger is not shown in the transcript and is stripped
before model-message conversion.

## 15. Conversation lifecycle

The MVP should support an active conversation and a simple:

New Chat

action.

Starting a new chat clears conversational context while retaining:

the connected athlete dataset;
athlete data profile;
current application capabilities.

Saving and reopening multiple named conversations may be added later if implementation time allows.

## 16. Athlete profile context

The AI should have access to a compact automatically generated description of the athlete dataset.

This allows the assistant to begin with useful context before the user has selected anything.

Potential information includes:

years represented;
number of activities;
available metrics;
typical distance ranges;
typical elevation ranges;
broad recent activity patterns.

An optional user-entered profile may provide additional context such as:

goals;
training background;
upcoming events;
analytical interests.

This should supplement the data rather than replace data-derived evidence.

## 17. Empty / initial state

When the application first opens, the user should not face an empty analytical canvas with no direction.

The initial state should show:

a useful default selection;
a sensible default visualization;
a short dataset overview;
the AI assistant ready for questions.

The assistant may offer a few initial analytical paths, such as:

recent versus historical performance;
seasonal patterns;
relationships between available metrics;
cumulative activity volume.

These are starting points, not a fixed menu of supported questions.

## 18. Uncertainty and limitations in the UI

The assistant should explicitly surface limitations when relevant.

Examples:

"Only 4 activities match this selection."
"Elevation differs substantially between these groups."
"This relationship does not establish causation."
"The dataset does not contain heart-rate or power data."

The UX should make analytical uncertainty feel normal rather than like an error state.

## 19. Assistant Markdown

Assistant messages may render Markdown for readability, including paragraphs,
emphasis, ordered and unordered lists, inline code, safe links, and GFM tables.
Tables render as semantic tables and scroll horizontally inside the assistant
message when they are wide.

User messages remain plain text. Raw HTML is disabled, and link handling remains
restricted to approved safe schemes.

## 20. Portfolio UX standard

The deployed application should be understandable within a few minutes.

A reviewer should be able to:

understand what the project does;
start with the default sanitized demo source;
manipulate the data manually;
see the visualization change;
ask the AI a question;
see that the AI understands the current state;
apply a suggested analysis;
understand why this interaction model differs from a normal chatbot.

The interface should prioritize clarity of the interaction model over visual complexity.
