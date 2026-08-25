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

The assistant may propose a typed View Suggestion when changing a view or filter would materially help. Runtime suggestions carry an `id`, `label`, optional `rationale`, a validated executable `patch`, and display-only `changes`. Suggestions are shown as user-controlled Apply/Dismiss cards and never mutate `AnalysisState` automatically. Apply patches the current `AnalysisState`, preserving unrelated current state; no old complete proposed state is installed. Suggestions support only constrained view and selection fields; `comparison`, `grouping`, and arbitrary query language are not supported.

View Suggestions can be pending, applied, dismissed, or ignored. Ordinary manual view/filter exploration preserves pending suggestions. A later manual chat message marks remaining pending suggestions ignored, and source/data-context changes invalidate pending suggestions. Applying a suggestion automatically continues the analysis after the client observes the updated current state and selected activities. This uses a hidden internal trigger that is stripped before model-message conversion, plus compact context telling the model the user just accepted the change; no visible synthetic user message is added.

Assistant Markdown supports paragraphs, emphasis, lists, inline code, safe links, and GFM tables. Tables render as semantic tables with local horizontal scrolling for wide content. User messages remain plain text, raw HTML is disabled, and safe-link handling remains restricted to approved schemes.

Current request-size measurements show that selected activities dominate `/api/chat` payload size: roughly 100 activities is 33 KiB, 500 is 161 KiB, 1000 is 320 KiB, 1500 is 479 KiB, and 2000 is 638 KiB. About 1000 activities plus representative message history is 328 KiB. The current 2000 selected-activity cap and 3 MB request-body guard remain; current evidence does not justify broader transport architecture yet.

Demo is the default source for normal visitors. The bundled demo snapshot contains 1000 sanitized normalized activities: 849 Ride and 151 Walk. Original IDs are replaced with demo IDs, and no raw Strava payloads, private metadata, routes, coordinates, or location fields are bundled. Strava OAuth remains available for users connecting their own account. `/api/chat` remains public with validation and size guards; Sprint 14 uses a document-and-observe public-usage posture and does not add new auth or rate-limit infrastructure.

## Current Workspace Semantics

Manual selection uses explicit years, days of week, and a recurring Seasonal window. When a source loads, the app selects all available years; clearing all years intentionally selects zero activities. Clearing all days also selects zero activities. The default Seasonal window is the full year, `01-01` through `12-31`, and absolute date ranges compose with that recurring window using AND semantics.

Primary selection controls are Years and Activity type. Days, absolute date range, Seasonal window, distance, and elevation live under collapsed `More Filters`. Chart View and Metric controls stay with the chart, while the selection summary has a stable chart-card region.
