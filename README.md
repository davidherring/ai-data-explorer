# ai-data-explorer

This repository contains the Interactive AI Data Explorer, a Strava-based proof of concept for embedding an AI collaborator into an interactive data-visualization environment.

## Deployment and Environment

The application is deployed on Vercel as a Vite application with server-side API functions in the root `api/` directory.

Strava OAuth and connected activity loading require these server-side environment variables:

```text
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=
STRAVA_TOKEN_COOKIE_SECRET=
```

The AI conversation endpoint also requires a server-side OpenAI key:

```text
OPENAI_API_KEY=
```

Do not expose Strava or OpenAI secrets through `VITE_` variables or commit local `.env` files. `OPENAI_API_KEY` must remain server-side only. The placeholder names are listed in `.env.example`.

For local UI-only work, `npm run dev` starts the Vite client. For local OAuth, Strava API, or AI chat testing, use `vercel dev` so the Vite app and root `/api` functions run together in the same local environment.

`STRAVA_REDIRECT_URI` must match the callback URL configured in the Strava developer application. Use the local callback URL when testing with `vercel dev`, and the deployed Vercel callback URL for production. Vercel production and preview environments need the same server-side Strava variables configured with values appropriate for that environment.

The deployed AI chat endpoint requires `OPENAI_API_KEY` to be configured in the Vercel environment. Normal automated tests mock the AI boundary and do not make live OpenAI calls.

## AI Conversation Behavior

The assistant is grounded in the same typed analysis state that drives the visualization. Each submitted chat message sends the current `AnalysisState` snapshot, selected normalized activities, compact dataset profile, source metadata, and counts to `/api/chat`. The app captures this context only when the user submits a message; changing filters or views does not send a request by itself.

The chat transcript is browser-memory only. New Chat clears the visible transcript without changing the analysis state, and there is no database, saved chat, server session, or persistence layer.

Deterministic tools perform analytical calculations server-side over the submitted selected activities. The model interprets structured tool results; raw activity arrays are available to tools but are not pasted into the model prompt text.

Grouped comparison tools can compare years, months, weekdays/weekends, or days of week only within the activities included in the submitted selection; they do not reach outside the current selection. Their outputs are deterministic observations and associations for the assistant to interpret, not causal proof.

The assistant may propose a typed View Suggestion when changing a view or filter would materially help. Suggestions are validated server-side, shown as user-controlled Apply/Dismiss cards, and never mutate `AnalysisState` automatically. Apply is guarded by a source-state fingerprint, so stale suggestions cannot apply after the user changes the current view or filters. Suggestions support only constrained view and selection fields; `comparison`, `grouping`, and arbitrary query language are not supported.

## Current Workspace Semantics

Manual selection uses explicit years, days of week, and a recurring Seasonal window. When a source loads, the app selects all available years; clearing all years intentionally selects zero activities. Clearing all days also selects zero activities. The default Seasonal window is the full year, `01-01` through `12-31`, and absolute date ranges compose with that recurring window using AND semantics.

Primary selection controls are Years and Activity type. Days, absolute date range, Seasonal window, distance, and elevation live under collapsed `More Filters`. Chart View and Metric controls stay with the chart, while the selection summary has a stable chart-card region.
