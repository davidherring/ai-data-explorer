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

Do not expose Strava secrets through `VITE_` variables or commit local `.env` files. The placeholder names are listed in `.env.example`.

For local UI-only work, `npm run dev` starts the Vite client. For local OAuth or API testing, use `vercel dev` so the Vite app and root `/api` functions run together in the same local environment.

`STRAVA_REDIRECT_URI` must match the callback URL configured in the Strava developer application. Use the local callback URL when testing with `vercel dev`, and the deployed Vercel callback URL for production. Vercel production and preview environments need the same server-side Strava variables configured with values appropriate for that environment.
