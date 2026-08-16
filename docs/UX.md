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

Initial controls may include:

date or year range;
weekday / weekend / all;
specific day of week;
minimum and maximum distance;
minimum and maximum elevation;
activity type.

The user should not be required to understand a predefined ride taxonomy.

For example, an athlete may construct a practical "weekday ride" population through:

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

individual rides visible where appropriate;
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
unusual rides;
shifts in ride composition.

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

all rides;
rides over 30 miles;
weekend rides;
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
- date/year range
- weekday/weekend
- day of week
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

Aggregation
- raw
- weekly
- biweekly
- other supported mode

This state drives both the visualization and the AI context.

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
"Recent rides in this selection are slower, but they also contain substantially more elevation than the historical rides. I would be cautious about comparing average speed directly."

User:
"What about similar-elevation rides?"

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

"Your 2026 Wednesday rides contain substantially more elevation than earlier years. A speed-versus-elevation view would help test whether ride difficulty explains the difference."

[View Suggestion]

The button should not interrupt the user's reading or automatically change the workspace.

If the user chooses the suggestion:

the proposed analysis state is applied;
the visualization updates;
the accepted action is recorded in the conversation context.

The user may ignore the suggestion and continue the conversation instead.

## 13. AI suggestion structure

A suggestion should contain enough structured information to reproduce the proposed view.

Conceptually:

type AnalysisSuggestion = {
  label: string;
  proposedState: AnalysisState;
};

The visible UI may only show:

View Suggestion

The underlying structured state preserves exactly what will change.

## 14. Conversation transcript

The visible transcript contains normal user and assistant messages.

Internally, each conversational turn should also retain relevant analytical context.

A turn may include:

User message
Analysis-state snapshot


Assistant response
Tool results
Optional analysis suggestion


Optional UI event:
suggestion accepted

Dashboard changes made between messages do not need to be stored as transcript events.

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
number of rides;
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

"Only 4 rides match this selection."
"Elevation differs substantially between these groups."
"This relationship does not establish causation."
"The dataset does not contain heart-rate or power data."

The UX should make analytical uncertainty feel normal rather than like an error state.

## 19. Portfolio UX standard

The deployed application should be understandable within a few minutes.

A reviewer should be able to:

understand what the project does;
manipulate the data manually;
see the visualization change;
ask the AI a question;
see that the AI understands the current state;
apply a suggested analysis;
understand why this interaction model differs from a normal chatbot.

The interface should prioritize clarity of the interaction model over visual complexity.
