# Contributing

## Workflow

1. Read the [architecture](docs/ARCHITECTURE.md), [current state](docs/WORK-COMPLETED.md) and [agent instructions](AGENTS.md).
2. Install the three packages using their own lockfiles. Use a disposable database for experimentation.
3. Create a focused branch, for example `git switch -c codex/session-status` for agent work or a descriptive feature branch for human work.
4. Make the change and update the documentation that describes it.
5. Run relevant tests/builds. For policy, authorization or database changes, run the full backend suite. Validate phone-specific changes on a physical Android device when possible.
6. Inspect the diff and staged files for secrets, generated output and unrelated edits.
7. Commit with a concrete description and open a review explaining the resulting behavior and evidence.

## Code and schema conventions

Backend code is TypeScript using ESM imports with `.js` suffixes. Route controllers should call services for business rules. Use bound SQL parameters, `requireSessionAccess`/role middleware for authorization, and the shared transaction wrapper for related attendance writes. Notifications must follow commit.

Keep UI logic in mobile `screens/` and reusable elements in `components/`; keep API access in `lib/api.ts`. Native/web differences belong in platform-specific modules where appropriate. Admin API calls go through `src/services/api.ts`.

Database migrations are appended to `sql/` with a numeric prefix. Include a regression for a migration-sensitive behavior and verify a clean database. Existing deployed ledgers require a new migration even if an older file is edited locally.

## Validation commands

From the root: `npm test` and `npm run build`. From `admin-dashboard`: `npm run build`. From the mobile directory: `npm test` and `node node_modules/typescript/bin/tsc --noEmit`.

There is no configured linter or end-to-end native UI test runner. Do not report nonexistent checks. The backend tests use isolated PGlite; separate external PostgreSQL checks are needed before a PostgreSQL release.

## Reporting bugs

Include the app version, Android version/device, role, session state, expected/actual result, error text, approximate screen/font settings and whether the API health endpoint responds. Distinguish GPS accuracy from computed distance. Redact QR payloads, JWTs, precise coordinates and student information from public reports.

## Review checklist

- Authorization is checked at the API boundary and does not rely on hidden UI controls.
- Failures and pending outcomes are not displayed as saved attendance.
- Session origin, identity and replay rules remain consistent across scanner, personal pass and big-screen flows.
- Local setup, deployment and migration instructions match the final code.
- No `.env`, private keys, database files, APKs or temporary credentials are staged.
