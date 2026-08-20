# Sprint 01 — Production Repository and Application Shell

## Sprint Goal

Establish a healthy production repository and deployable application shell for the Interactive AI Data Explorer without implementing product features ahead of the planned foundation.

## 1. Repository and Documentation Baseline

Objective: Make the repository understandable, safe to work in publicly, and aligned with the existing product/design source of truth.

Deliverables:

- README with project summary, setup, development, verification, and deployment notes.
- Environment variable example file with placeholders only.
- Confirmed `.gitignore` coverage for secrets, local env files, build output, dependencies, and private Strava exports.
- Lightweight repository structure for source, tests, fixtures, docs, and task tracking.
- Decision-log entry only if Sprint 1 introduces a material product or architecture choice not already covered.

Verification / exit criteria:

- A new developer can identify the product goal, setup path, and verification commands from repository docs.
- No committed secrets, tokens, `.env` files, or raw private Strava exports.
- Existing product/design documents remain unchanged unless a concrete conflict is documented.

## 2. React + Vite + TypeScript Application Skeleton

Objective: Create the minimal frontend application shell that future product work can build on.

Deliverables:

- React + Vite + TypeScript project scaffold.
- Basic app layout placeholder for analysis workspace and AI conversation panel.
- Initial source organization for components, data, analysis, state, fixtures, and tests.
- Browser-visible shell that clearly identifies the project without implementing analytical behavior.

Verification / exit criteria:

- Local dev server starts successfully.
- App renders without console errors.
- TypeScript project configuration is present and used by verification commands.
- No Strava OAuth, AI chat, visualization, or analytical feature implementation is added in this phase.

## 3. Engineering Harness: Lint, Typecheck, Tests, Build, GitHub Actions

Objective: Make routine engineering quality checks fast, repeatable, and enforced in CI.

Deliverables:

- Package scripts for lint, typecheck, test, and build.
- ESLint and TypeScript configuration suitable for React application work.
- Test runner configured for unit tests.
- Initial smoke test for the app shell.
- GitHub Actions workflow running install, typecheck, lint, test, and build on pull requests and pushes.

Verification / exit criteria:

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass locally.
- CI workflow uses the same commands as local development.
- Tests do not require live Strava, model provider, network, or Vercel credentials.

## 4. Safe Demo Dataset and Initial Normalized Ride Model

Objective: Establish a public-safe data foundation for development and portfolio review.

Deliverables:

- Small synthetic or sanitized demo ride fixture with no private identifiers or location-sensitive fields.
- Initial TypeScript `Ride` type based on `docs/DATA-MODEL.md`.
- Minimal fixture-loading boundary for demo data.
- Notes documenting whether the fixture is synthetic or sanitized.

Verification / exit criteria:

- Demo fixture can be imported by tests without network access.
- Fixture includes enough variation to later exercise date, distance, elevation, speed, and seasonal behavior.
- No raw private Strava export or precise location data is committed.

## 5. Minimal Shared AnalysisState Skeleton

Objective: Define the shared state contract that will later drive visualization, deterministic analysis, and AI context.

Deliverables:

- Initial TypeScript types for `ActivitySelection`, `ViewConfiguration`, and `AnalysisState`.
- Default analysis state for the shell.
- Narrow tests for default state shape and supported view identifiers.
- Clear separation between state types and future UI/AI implementation.

Verification / exit criteria:

- `AnalysisState` supports one primary selection and optional comparison.
- View configuration includes the planned MVP view types: trend, relationship, seasonal, and cumulative.
- No separate UI-only or AI-only analysis state model is introduced.

## 6. Initial Vercel Deployment

Objective: Confirm the application shell can be deployed publicly before product complexity is added.

Deliverables:

- Vercel project setup for the production repository.
- Deployment configuration only where needed for the Vite application.
- Documented environment variable expectations.
- Public deployment URL for the app shell.

Verification / exit criteria:

- Production deployment succeeds from the repository.
- Deployed shell loads in a browser without runtime errors.
- Deployment does not require real Strava credentials, model provider credentials, or private data for the shell phase.
- Repository documentation records how to verify or redeploy the shell.

## Closeout

- Shipped the production repository baseline, React/Vite/TypeScript shell, CI-quality scripts, synthetic demo data, initial normalized `Ride` model, and shared `AnalysisState` skeleton.
- Established the core product boundary that visualization and future AI work use the same typed analysis state rather than separate UI/AI models.
- Demo data remained public-safe and importable by tests without live APIs or credentials.
- Current repo verification passes `typecheck`, `lint`, `test`, and `build`; `npm test` currently reports 28 files / 297 tests.
- Historical Sprint 1 test count is not recoverable from the current task file, so only current verification is recorded.
- Product features, Strava OAuth, AI, and real visual analytics were intentionally deferred to later sprints.
