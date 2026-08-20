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

The assistant is grounded in the same typed analysis state that drives the visualization. Each submitted chat message sends the current `AnalysisState` snapshot, selected normalized rides, compact dataset profile, source metadata, and counts to `/api/chat`. The app captures this context only when the user submits a message; changing filters or views does not send a request by itself.

The chat transcript is browser-memory only. New Chat clears the visible transcript without changing the analysis state, and there is no database, saved chat, server session, or persistence layer.

Deterministic tools perform analytical calculations server-side over the submitted selected rides. The model interprets structured tool results; raw ride arrays are available to tools but are not pasted into the model prompt text.
