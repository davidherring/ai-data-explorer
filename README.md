# Interactive AI Data Explorer

Interactive AI Data Explorer is a Strava-based activity analysis application that combines interactive visualizations with an AI collaborator grounded in the same typed analytical state as the UI.

Live app: https://ai-data-explorer-one.vercel.app

The Demo source loads immediately without Strava authorization. Connecting Strava is optional for users who want to inspect their own activity data.

## What To Try

1. Open the live app and leave the source set to Demo.
2. Ask the assistant: `What stands out in this selection?`
3. Inspect a point or bucket in Trend, Relationship, Seasonal, or Cumulative.
4. Apply a View Suggestion and watch the assistant automatically analyze the updated state.
5. Use `More Filters` to narrow years, activity type, days, date windows, distance, or elevation.

## Engineering Highlights

- 4 interactive visualization modes: Trend, Relationship, Seasonal, and Cumulative.
- 4 deterministic analytical AI tools plus a typed View Suggestion workflow.
- 1,000 sanitized real-data Demo activities bundled for public review.
- 418 automated tests across 33 test files.

## Architecture Overview

The visualization workspace and AI assistant share one typed `AnalysisState`. Manual controls update that state, charts render from it, and each submitted chat message sends the current state snapshot, selected normalized activities, compact dataset profile, source metadata, and counts to `/api/chat`.

Deterministic tools perform analytical calculations server-side over the submitted selected activities. The model interprets structured tool results; raw activity arrays are available to tools but are not pasted into the model prompt text.

The assistant may propose a typed View Suggestion when changing a view or filter would materially help. Runtime suggestions carry an `id`, `label`, optional `rationale`, a validated executable `patch`, and display-only `changes`. Suggestions are user-controlled and never mutate `AnalysisState` automatically. Apply patches the current `AnalysisState`, preserving unrelated current state; no old complete proposed state is installed.

## Demo And Data

Demo is the default source for normal visitors. The bundled demo snapshot contains 1,000 sanitized normalized activities: 849 Ride and 151 Walk. Original IDs are replaced with demo IDs, and no raw Strava payloads, private metadata, routes, coordinates, or location fields are bundled. This describes what was removed and replaced; it is not a formal anonymity claim.

Strava OAuth remains available for users connecting their own account.

## AI Conversation Behavior

The app captures analytical context only when the user submits a message; changing filters or views does not send a request by itself.

The chat transcript is browser-memory only. New Chat clears the visible transcript without changing the analysis state, and there is no database, saved chat, server session, or persistence layer.

Grouped comparison tools can compare years, months, weekdays/weekends, or days of week only within the activities included in the submitted selection; they do not reach outside the current selection. Their outputs are deterministic observations and associations for the assistant to interpret, not causal proof.

View Suggestions can be pending, applied, dismissed, or ignored. Ordinary manual view/filter exploration preserves pending suggestions. A later manual chat message marks remaining pending suggestions ignored, and source/data-context changes invalidate pending suggestions. Applying a suggestion automatically continues the analysis after the client observes the updated current state and selected activities. This uses a hidden internal trigger that is stripped before model-message conversion, plus compact context telling the model that the suggestion was just applied successfully; no visible synthetic user message is added.

Assistant Markdown supports paragraphs, emphasis, lists, inline code, safe links, and GFM tables. Tables render as semantic tables with local horizontal scrolling for wide content. User messages remain plain text, raw HTML is disabled, and safe-link handling remains restricted to approved schemes.

Current request-size measurements show that selected activities dominate `/api/chat` payload size: roughly 100 activities is 33 KiB, 500 is 161 KiB, 1000 is 320 KiB, 1500 is 479 KiB, and 2000 is 638 KiB. About 1000 activities plus representative message history is 328 KiB. The current 2,000 selected-activity cap and 3 MB request-body guard remain; current evidence does not justify broader transport architecture yet.

`/api/chat` remains public with validation and size guards. This is a document-and-observe public-usage posture, not a claim that the endpoint is abuse-proof.

## Current Workspace Semantics

Manual selection uses explicit years, days of week, and a recurring Seasonal window. When a source loads, the app selects all available years; clearing all years intentionally selects zero activities. Clearing all days also selects zero activities. The default Seasonal window is the full year, `01-01` through `12-31`, and absolute date ranges compose with that recurring window using AND semantics.

Primary selection controls are Years and Activity type. Days, absolute date range, Seasonal window, distance, and elevation live under collapsed `More Filters`. Chart View and Metric controls stay with the chart, while the selection summary has a stable chart-card region.

## Deployment And Environment

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
