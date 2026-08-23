# Interactive AI Data Explorer — Data Model

## 1. Purpose

The data model should separate Strava-specific API responses from the analytical representation used by the application.

The rest of the application should not depend directly on the complete Strava activity schema.

The normalization layer should produce a compact, typed representation containing the fields needed for:

- filtering;
- visualization;
- deterministic analysis;
- AI context;
- future extension.

---

## 2. Data Flow

Conceptually:

```text
Strava API
    ↓
Strava API types
    ↓
Normalization
    ↓
Normalized Activity
    ↓
Derived analytical fields
    ↓
Selection + analytics layer
    ↓
Visualizations + AI tools
```

The normalization boundary should make API-specific changes easier to isolate.

## 3. MVP Activity Scope

The initial application focuses on supported Strava activities.

Other Strava activity types may exist in the connected account but do not need to participate in the MVP.

The application should preserve enough abstraction that additional activity types could be supported later without redesigning the entire system.

## 4. Normalized Activity

A first-pass normalized activity model may look like:

```ts
type Activity = {
  id: string;

  startTime: string;
  localDate: string;

  year: number;
  month: number;
  weekOfYear: number;
  dayOfWeek: DayOfWeek;
  isWeekend: boolean;

  distanceMiles: number;
  movingTimeMinutes: number;

  averageSpeedMph: number;
  elevationGainFeet: number;

  sportType: string;

  trainer: boolean;
  commute: boolean;
  manual: boolean;
};
```

This schema is provisional.

Only fields with a clear product or analytical purpose should be added.

## 5. Identity Fields

The internal model may preserve a Strava activity identifier for:

refresh/update logic;
deduplication;
linking to the source activity if desired;
finding a specific activity.

Public demo or fixture datasets should replace or remove personal identifiers.

## 6. Time Fields

The model should preserve enough time information for:

chronological trends;
seasonal alignment;
recent windows;
day-of-week filtering.

Derived fields should include:

local date;
year;
month;
week of year;
day of week;
weekday/weekend.

These values should be derived deterministically during normalization.

## 7. Distance

Strava returns metric units.

The application may normalize into display-friendly units such as miles for the initial US-oriented interface.

The internal choice should be consistent and explicit.

If later supporting user-selectable units, unit conversion should remain separate from the underlying analytical meaning.

## 8. Speed

Average speed is the primary performance metric for the initial project.

The normalized value should be represented in miles per hour for the MVP interface.

The app should preserve the distinction between:

average speed;
moving time.

The application should not invent an elevation-adjusted speed metric without a defensible methodology.

## 9. Elevation

Total elevation gain should be a first-class field.

It should support:

filtering;
scatter/relationship analysis;
selection summaries;
similarity calculations;
AI analysis.

Elevation is especially important because broad speed comparisons may be misleading when activity difficulty changes.

## 10. Weather

Weather and temperature are future enrichment data, not active normalized activity
fields in the Sprint 10 model.

Potential fields:

windSpeedMph?: number;
weatherSource?: string;

Weather may originate from:

Strava activity data;
an external historical weather service;
another future enrichment layer.

Starting temperature should be understood as a snapshot rather than a complete description of conditions over a long activity.

Wind is inherently more difficult to interpret because:

direction changes throughout a route;
wind direction matters;
conditions change during the activity.

Weather should therefore remain contextual rather than treated as a definitive difficulty metric.

## 11. Optional Metrics

Some athletes may have fields such as:

average heart rate;
max heart rate;
average power;
weighted power;
cadence.

The application should model metric availability rather than assume all athletes collect the same data.

Example:

```ts
type MetricAvailability = {
  averageSpeed: boolean;
  elevationGain: boolean;
  heartRate: boolean;
  power: boolean;
  cadence: boolean;
};
```

This information should be available to:

the UI;
the AI dataset profile;
analysis tools.

The MVP does not require heart rate or power.

## 12. Activity Selection

A selection describes a subset of activities.

Conceptually:

```ts
type ActivitySelection = {
  dateRange?: {
    start?: string;
    end?: string;
  };

  years?: number[];

  dayMode?: "all" | "weekday" | "weekend";

  daysOfWeek?: DayOfWeek[];

  distanceMiles?: {
    min?: number;
    max?: number;
  };

  elevationGainFeet?: {
    min?: number;
    max?: number;
  };

  sportType?: string;
};
```

Recurring month/day windows are represented separately from year-bearing
absolute date ranges so the same seasonal window can be applied across selected
years.

## 13. Selection Semantics

Selections should be composable.

Example:

Year:
2026

Days:
Wednesday

Distance:
10–30 miles

Elevation:
1200–1500 feet

The application should apply all active conditions together.

No implicit activity category should be required.

## 14. Comparison Model

Comparisons should reuse the same selection type.

Conceptually:

```ts
type AnalysisComparison = {
  primary: ActivitySelection;
  secondary?: ActivitySelection;
};
```

The secondary selection is optional.

Single-selection analysis remains the default.

## 15. View Configuration

A typed view configuration should represent the active visualization.

Conceptually:

```ts
type ViewType =
  | "trend"
  | "relationship"
  | "seasonal"
  | "cumulative";

Potential configuration:

type ViewConfiguration = {
  type: ViewType;

  xMetric?: MetricKey;
  yMetric?: MetricKey;

  cumulativeMetric?: MetricKey;

  colorBy?: GroupingKey;
};
```

Specific view types may eventually use discriminated unions if they require different fields.

## 16. Grouping

The application may group or encode observations by dimensions such as:

year;
month;
weekday/weekend;
day of week.

Grouping should be represented explicitly in analysis state rather than inferred from visualization code.


## 17. Aggregation

Some views require aggregation.

Potential modes include:

type AggregationMode =
  | "raw"
  | "weekly"
  | "biweekly";

The final model may instead represent aggregation as a structured object.

Aggregation should preserve:

sample count;
statistic used;
time bucket.

Example:

type AggregatedPoint = {
  bucketStart: string;
  sampleCount: number;
  value: number;
  sparse: boolean;
};

Low-sample summaries should be identifiable by the visualization and AI layers.

## 18. Dataset Profile

The application should derive a compact profile from all normalized activities.

Conceptually:

type AthleteDatasetProfile = {
  firstActivityDate: string;
  lastActivityDate: string;

  totalActivityCount: number;

  metricAvailability: MetricAvailability;

  distanceSummary: DistributionSummary;
  elevationSummary: DistributionSummary;
  speedSummary: DistributionSummary;

  recentActivity?: RecentActivitySummary;
};

The profile should remain compact enough for repeated use in AI context.

## 19. Distribution Summary

A reusable summary structure may include:

type DistributionSummary = {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25?: number;
  p75?: number;
};

Not every value must be sent to the model on every request.

The structure exists to support deterministic analysis.

## 20. Selection Summary

Each active selection should have a deterministic summary.

Conceptually:

```ts
type SelectionSummary = {
  activityCount: number;

  dateRange?: DateRange;

  totalDistanceMiles?: number;
  totalElevationFeet?: number;

  averageSpeedMph?: number;
  medianSpeedMph?: number;

  averageDistanceMiles?: number;
  medianDistanceMiles?: number;

  averageElevationFeet?: number;
  medianElevationFeet?: number;

  metricAvailability: MetricAvailability;
};
```

This summary may be passed with the current analysis snapshot.


## 21. Sparse Data

Analysis functions should explicitly represent insufficient or sparse data.

Examples:

fewer than 2 activities;
too few observations for a meaningful trend;
too few observations for a relationship calculation.

Tools should return metadata such as:

type AnalysisQuality = {
  sampleCount: number;
  sufficient: boolean;
  warning?: string;
};

The AI should not need to infer data quality indirectly.

## 22. Similarity

The MVP may support activity similarity using existing normalized dimensions.

A simple similarity model may compare:

distance;
elevation;
seasonal timing;
weekday/weekend;
optional other available metrics.

Similarity should not initially require:

segment analysis;
route-polyline matching;
sophisticated geospatial algorithms.

Those may be added later if they become valuable.

## 23. Raw Strava Data

Raw Strava responses may be cached or persisted as needed for development or refresh behavior.

However, raw responses should not become the application's analytical domain model.

Location-sensitive fields such as:

start coordinates;
end coordinates;
route polylines;

should not be included in public fixture data unless deliberately sanitized.

## 24. Public Demo Data

The public repository should not contain the developer's private Strava export.

A demo strategy may use:

synthetic activities;
sanitized fixture data;
a small generated dataset with realistic distributions.

The demo data should preserve enough variation to demonstrate:

filters;
trends;
seasonal comparison;
relationships;
cumulative views;
AI tool behavior.

## 25. Refresh Semantics

The production app should support updating the local dataset from Strava.

Refresh logic should:

retrieve new or changed activities;
normalize them;
avoid duplicate records;
update dataset summaries.

The exact persistence strategy will be determined in the architecture design.

## 26. Testing Priorities

The data layer should have strong automated tests around:

Strava-to-Activity normalization;
unit conversion;
date-derived fields;
selection filtering;
aggregation;
sparse-data handling;
selection summaries;
comparison calculations;
tool outputs.

The analytical layer should be testable independently from:

React;
D3;
the language model;
live Strava API calls.

## 27. Design Principle

The data model should be flexible enough to support different athletes without attempting to predict every future data source or analytical domain.

The MVP should model the activity data it actually needs.

Future abstractions should emerge from real requirements.
