# Sprint 02 - Strava OAuth and Connected Ride Data

## Sprint Goal

Connect the application to real Strava athlete cycling data through OAuth, retrieve activities server-side, normalize them into the existing `Ride` model, and allow the application to use either demo data or connected Strava data through a clean data-source boundary.

Do not implement visualizations, AI functionality, or analytical tools in this sprint.

Approved Sprint 2 decisions:

- Request Strava `activity:read_all`.
- Use encrypted HttpOnly cookie token persistence as an MVP/no-database choice, not as the final production architecture.
- Store connected `Ride[]` in memory only.
- Refetch connected rides after reload when the token cookie remains valid.
- Fetch the full paginated activity history on refresh.
- Filter activities using Strava `sport_type`, not deprecated `type`.
- Include relevant Strava cycling sport types rather than only `Ride`.
- Keep normalized `Ride.sportType` as `string`.
- Do not introduce a database.
- Do not add browser or `localStorage` persistence for normalized rides.
- Leave `Ride.temperatureF` undefined for live Strava rides in Sprint 2 because `/athlete/activities` returns `SummaryActivity`, which does not reliably include a scalar temperature field.

## 1. Strava OAuth Server Boundary

Objective: Add the smallest server-side OAuth flow that keeps Strava credentials and tokens out of browser-readable application code.

Deliverables:

- Root `api/` Vercel Function routes for starting OAuth, handling callback, checking connection status, and disconnecting.
- OAuth authorization request using `activity:read_all`.
- Callback validation for `state`, denied access, missing code, and granted scopes.
- Server-side authorization-code exchange with Strava.
- Typed app responses for success and user-actionable failures.

Verification / exit criteria:

- User can start Strava connection from the app.
- Callback rejects invalid state and insufficient scope.
- Client secret, authorization code, access token, and refresh token are never exposed to browser-readable JavaScript.
- No credentials or tokens are logged or committed.

## 2. Token Cookie Persistence and Refresh

Objective: Support Sprint 2 connected-data use without adding a database.

Deliverables:

- Encrypted token bundle stored in an HttpOnly, Secure, SameSite cookie.
- Cookie contents limited to token values, expiry, granted scopes, and minimal athlete identity needed for connection status.
- Server-side helper to decrypt, validate, refresh, rotate, and re-encrypt token bundles.
- Refresh behavior before Strava API calls when the access token is expired or near expiry.
- Disconnect endpoint that clears the token cookie.
- README and `.env.example` notes documenting this as an MVP/no-database persistence choice.

Verification / exit criteria:

- Expired access tokens are refreshed without user action.
- Rotated refresh tokens are persisted back into the encrypted cookie.
- Invalid, missing, or undecryptable token cookies produce a typed unauthenticated state.
- Browser code can determine connection status but cannot read token values.

## 3. Strava Activity Retrieval

Objective: Fetch the authenticated athlete's cycling activity history through a server-side Strava API boundary.

Deliverables:

- Narrow Strava API client for `/athlete/activities`.
- Pagination using `page` and `per_page`.
- Full-history fetch for Sprint 2 refresh behavior.
- Filtering by `sport_type`.
- Supported cycling sport types:
  - `Ride`
  - `MountainBikeRide`
  - `GravelRide`
  - `VirtualRide`
  - `EBikeRide`
  - `EMountainBikeRide`
  - `Velomobile`
  - `Handcycle`
- Typed error mapping for authorization failures, insufficient scope, rate limits, malformed responses, and upstream Strava failures.

Verification / exit criteria:

- Server retrieves all pages until Strava returns fewer than `per_page` activities or an empty page.
- Non-cycling activities are excluded before normalization.
- Raw Strava payloads stay inside the integration layer.
- Normal tests do not make live Strava requests.

## 4. Strava Normalization

Objective: Preserve the existing normalized `Ride` boundary and prevent raw Strava response shapes from leaking into the app.

Deliverables:

- Narrow `StravaSummaryActivity` type containing only fields required by Sprint 2 normalization.
- Pure normalization function from `StravaSummaryActivity` to `Ride`.
- Unit conversions:
  - meters to miles;
  - meters to feet;
  - seconds to minutes;
  - meters per second to miles per hour.
- Deterministic date-derived fields from `start_date_local`:
  - `localDate`;
  - `year`;
  - `month`;
  - `weekOfYear`;
  - `dayOfWeek`;
  - `isWeekend`.
- Deduplication by Strava activity ID.
- Live Strava `temperatureF` left undefined in Sprint 2.

Verification / exit criteria:

- Normalized output is `Ride[]`.
- `Ride.sportType` preserves the Strava `sport_type` string.
- Location-sensitive fields such as coordinates, maps, and polylines are not included in normalized rides.
- Normalization tests cover unit conversion, date derivation, sport filtering, missing optional fields, and deduplication.

## 5. Demo Versus Connected Data-Source Boundary

Objective: Let the app use either demo rides or connected Strava rides without changing downstream consumers.

Deliverables:

- Typed data-source boundary with at least `demo` and `strava` sources.
- Demo source continues to load existing synthetic rides.
- Connected source fetches normalized rides from the server.
- Client state for selected source, connection status, loading, refresh, and errors.
- Minimal shell UI for choosing demo data, connecting Strava, refreshing connected rides, and disconnecting.

Verification / exit criteria:

- App works in demo mode without Strava credentials.
- App can switch to connected mode after OAuth.
- Connected rides are stored in memory only.
- Reloading the page refetches connected rides if the encrypted token cookie remains valid.
- No browser or `localStorage` persistence for normalized connected rides is added.

## 6. Refresh and Update Behavior

Objective: Provide a simple, explicit data refresh path without incremental sync infrastructure.

Deliverables:

- User-initiated refresh action for connected Strava data.
- Refresh fetches full paginated activity history.
- Refreshed results replace the in-memory connected dataset after successful normalization.
- Existing demo data remains unaffected by connected refresh.

Verification / exit criteria:

- Refresh updates connected rides during the session.
- Refresh failures preserve the last successfully loaded in-memory connected rides when available.
- Errors are visible to the user without exposing private Strava details.
- No webhooks, background jobs, database tables, or incremental sync logic are introduced.

## 7. Environment, Vercel, and Documentation

Objective: Make local and deployed configuration explicit while keeping CI credential-free.

Deliverables:

- `.env.example` placeholders for required server-side Strava configuration.
- README setup notes for local Strava OAuth and Vercel environment variables.
- Vercel Function setup using the root `api/` directory.
- Vite development proxy or documented local flow for calling API functions during development if needed.

Required environment variables:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`
- `STRAVA_TOKEN_COOKIE_SECRET`

Optional environment variables:

- `STRAVA_AUTH_SCOPES`, defaulting to `activity:read_all`

Verification / exit criteria:

- CI does not require real Strava credentials.
- Demo mode build works without Strava environment variables.
- Connected-data endpoints fail clearly when required server-side environment variables are missing.
- No `VITE_` client-exposed Strava secret variables are introduced.

## 8. Testing and Verification

Objective: Preserve the green engineering harness while covering the new external boundary with mocked Strava behavior.

Deliverables:

- Unit tests for OAuth URL construction and scope validation.
- Unit tests for encrypted token bundle validation and token refresh behavior.
- Tests for refresh-token rotation.
- Tests for activity pagination.
- Tests for Strava error mapping.
- Tests for normalization and cycling `sport_type` filtering.
- Client tests for demo/connected source state where practical.
- Mocked Strava responses only; no live API calls in normal tests.

Verification / exit criteria:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
- Test suite remains deterministic and credential-free.

## Out of Scope

- Database persistence.
- Browser or `localStorage` persistence for connected rides.
- Incremental Strava synchronization.
- Strava webhooks.
- Detailed activity requests.
- External weather enrichment.
- Visualizations.
- AI assistant functionality.
- Deterministic analytical tools beyond data loading and normalization.

## Remaining Approved Architecture Note

Encrypted HttpOnly cookie token persistence is acceptable for Sprint 2 because it avoids adding infrastructure before the product needs it. This should be revisited before treating the application as a broader multi-user production system.
