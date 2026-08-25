# Interactive AI Data Explorer — Product

## 1. Product Summary

Interactive AI Data Explorer is a Strava-based activity analysis application that combines interactive data visualization with an embedded AI analytical collaborator.

The application is intended to help athletes explore their own historical activity data, test hypotheses, compare periods or activity populations, identify potentially meaningful patterns, and decide what to investigate next.

The core product idea is not "a dashboard with a chatbot."

The AI assistant shares the user's current analytical context. When the user asks a question, the assistant knows what data is currently selected, what visualization is being viewed, which metrics are active, and what deterministic summaries describe the current selection.

The assistant can then:

- answer questions about the current analysis;
- surface potentially interesting patterns;
- identify possible confounders or weak comparisons;
- call deterministic analysis tools;
- suggest a different analysis or visualization;
- provide a reversible "View Suggestion" action when a new view would help.

The user remains in control of the workspace.

---

## 2. Product Goal

The MVP should demonstrate that an AI collaborator can be integrated meaningfully into an interactive data-exploration environment.

The product should allow a user to move fluidly between:

1. manually exploring data;
2. asking the AI questions about the current view;
3. following new analytical paths suggested by the AI;
4. refining selections or comparisons;
5. continuing the conversation with shared context.

The success of the project does not depend on producing sophisticated sports-science conclusions.

The success condition is that the interaction feels like a useful analytical collaboration rather than a conventional dashboard plus an unrelated chat interface.

---

## 3. Primary User

The MVP is designed for a Strava athlete who wants to explore long-term supported activity data in more flexible ways than standard activity summaries allow.

The user may want to investigate questions such as:

- Am I faster or slower than I was in prior years?
- How does performance change through the season?
- Are recent activities actually comparable with historical activities?
- Does elevation appear related to speed?
- Has total or long-activity volume changed?
- Is a suspected training pattern supported by the data?
- What else in the data looks worth investigating?

These are representative questions, not a fixed question set.

The product should support open-ended exploration.

---

## 4. Core Product Principles

### 4.1 Selection-first analysis

The basic analytical unit is a selection of activities.

A selection is defined using flexible filters such as:

- year or date range;
- explicit days of week;
- distance range;
- elevation range;
- activity type;
- other supported metrics.

A selection can stand alone.

The user should not be required to create a comparison group.

Comparisons are optional.

---

### 4.2 Compare like with like

Broad averages can obscure meaningful differences between activity types.

The application should make it easy to refine a population before interpreting trends.

For example, a user may want to distinguish:

- shorter activities from long activities;
- weekday activities from weekend activities;
- flatter activities from high-elevation activities;
- one seasonal period from another.

The product should help the user notice when a comparison may be misleading.

---

### 4.3 Flexible exploration

The application should not assume that every athlete follows the same training routine.

The user's personal riding patterns informed the discovery process, but the product model should remain generic.

The application should be built from reusable analytical primitives rather than hard-coded activity categories.

---

### 4.4 Deterministic analysis, AI interpretation

Important calculations should be performed in code rather than estimated by the language model.

Examples include:

- summary statistics;
- comparisons;
- trends;
- relationships between metrics;
- cumulative values;
- similarity searches.

The AI interprets these results, places them in context, and helps the user decide what to explore next.

---

### 4.5 User-controlled AI actions

The AI should not silently change the dashboard.

When a different view or selection would help, the assistant may provide a short explanation and a "View Suggestion" action.

The user decides whether to apply it.

Suggestions are typed, validated, and user-controlled. They must not change
dashboard state automatically.

Not every AI response should include a suggestion.

The interaction is an ongoing dialogue, not a sequence of forced actions.

---

### 4.6 Analytical humility

The application should distinguish observation from explanation.

It may identify relationships or changes in the data, but should not claim causation without evidence.

For example:

Good:
"Recent activities in this selection are slower and also include substantially more elevation."

Bad:
"More climbing caused your performance decline."

The application should be especially cautious about medical, physiological, or training claims.

---

## 5. MVP Capabilities

### 5.1 Strava integration

The MVP should:

- authenticate a user with Strava OAuth;
- retrieve supported Strava activity data;
- refresh activity data;
- normalize Strava activity data into an internal Activity model.

The application should support a continuously updating dataset rather than rely on a static export.

---

### 5.2 Activity selection

The user should be able to manually filter activities by at least:

- date/year;
- explicit days of week;
- distance;
- elevation.

Weekday/weekend comparison remains available through deterministic grouped comparison rather than as a separate manual day-mode selector.

The design should make additional filters possible later.

---

### 5.3 Core visualization modes

The MVP should support a small set of flexible analytical views.

#### Trend over time

Show individual activities and performance trends over calendar time.

Useful for questions about recent or long-term changes.

#### Relationship / scatter

Show the relationship between two metrics.

Example:

- elevation gain vs. average speed.

Useful for identifying confounders or distinct activity populations.

#### Seasonal overlay

Align multiple years by week or seasonal position.

Useful for comparing equivalent parts of different years.

#### Cumulative view

Show cumulative values such as distance across the season.

Useful for understanding training volume and timing.

The MVP should prioritize flexibility and clarity over the number of available chart types.

---

### 5.4 AI analytical assistant

The assistant should:

- know the athlete data profile;
- know the current analysis state when the user submits a message;
- receive deterministic summaries of the selected data;
- maintain conversational context;
- use analysis tools when additional calculations are needed;
- surface 2–3 potentially interesting observations when appropriate;
- suggest additional analyses when useful;
- remain conversational when no dashboard action is needed.

---

### 5.5 Suggested analysis actions

An AI response may optionally include a structured suggestion.

Example:

"Recent Wednesday activities are slower, but elevation is also much higher than the historical selection. A speed-versus-elevation view may be more informative."

[View Suggestion]

Applying the suggestion updates the dashboard only after the user accepts it.

After a successful Apply, the dashboard updates from the suggestion patch and
the assistant automatically continues analysis once the current state and
selected activities reflect that change. No visible synthetic user message is
added for Apply or Dismiss.

---

### 5.6 Conversation context

Each conversational turn should preserve:

- user text;
- the analysis-state snapshot at submission time;
- assistant response;
- relevant tool results;
- any proposed suggestion;
- whether a suggestion was accepted.

The current dashboard state does not need to be recorded continuously between messages.

For the MVP, a simple active conversation with a "New Chat" action is sufficient.

---

## 6. Athlete Data Profile

The application should generate a compact overview of the connected dataset.

This may include:

- date range;
- activity count;
- available metrics;
- broad distance ranges;
- broad elevation ranges;
- recent activity volume;
- other stable dataset characteristics useful for grounding analysis.

This profile is part of the assistant's persistent context.

An optional user-entered profile may later provide context such as:

- goals;
- training background;
- preferences;
- upcoming events.

The product should not require this information to function.

---

## 7. Analytical Tool Layer

The implemented MVP tool layer supports:

- `summarizeSelection`
- `relationshipBetweenMetrics`
- `compareGroups`
- `calculateTrend`
- `proposeViewSuggestion`

Future candidate tools may include:

- `compareSelections`
- `findSimilarActivities`
- `summarizeRecentVsHistorical`

Tool outputs should be structured and testable.

The model should rely on tool outputs for important numerical claims.

---

## 8. Weather Data

Weather may add useful context to activity analysis.

Sprint 10 does not carry temperature as an active metric. Weather should be
treated as future enrichment rather than an always-missing field.

Potential future enrichment may include:

- starting temperature;
- wind speed;
- other historical weather conditions.

Weather values should be treated as contextual variables rather than proof of causation.

---

## 9. Product Success Criteria

The two-week MVP is successful if:

- Strava OAuth works;
- activity data is normalized and refreshed;
- the user can construct useful activity selections;
- 2–4 flexible visualizations support real exploration;
- the AI understands the current analysis state;
- the AI can use several deterministic analytical tools;
- conversations retain analytical context across turns;
- the assistant can surface useful observations and propose optional view changes;
- the application is publicly deployed;
- the repository is public, documented, tested, and understandable by another developer.

---

## 10. MVP Boundaries

The MVP will stay focused on Strava activity analysis.

It will not attempt to become a general-purpose analytics platform during the initial build.

The MVP will not attempt to provide medical diagnosis or authoritative training prescriptions.

The project will prioritize a small number of flexible, well-designed analytical views over a large visualization catalog.

Future abstractions should be earned by real requirements rather than added speculatively.
