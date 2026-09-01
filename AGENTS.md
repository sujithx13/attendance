# Instructions for development agents

## Start here

Read `README.md`, `docs/ARCHITECTURE.md`, `docs/WORK-COMPLETED.md` and the relevant setup/build guide before changing behavior. Inspect `git status`, the active branch and the actual files. Existing uncommitted changes can belong to the user; never discard them wholesale.

The mobile directory has its own `AGENTS.md`: read the exact Expo SDK 57 documentation before editing mobile code. Do not assume an older Expo/RN API. This is a three-package repository, not an npm workspace.

## Repository map

- `src/`: API, policy engine, persistence and WebSockets.
- `sql/`: ordered, ledger-recorded migrations.
- `tests/`: backend integration/regression suite.
- `admin-dashboard/`: React/Vite administration client.
- `KAHE-mobile-attendance-frontend-api/`: Expo/RN application and Vitest tests.
- `public/display/`: static browser pairing/QR display served by the API.
- `docs/`: maintained architecture, setup, deployment, API and change records.
- `data/`, `artifacts/`, native Android/iOS output and secrets: local/generated, excluded from Git.

## Core behavior to preserve

1. The backend makes attendance decisions. Decoding a QR in the UI is not proof of attendance.
2. Preserve `ACCEPT`, `CHALLENGE`, `REJECT` and distinguish accepted, pending and unconfirmed network outcomes.
3. Session IDs and timetable slot IDs are different. Resolve a slot through session context; personal passes must use an active real session.
4. A selected-session scanner rejects a code for another session before submission.
5. Faculty phone location is captured with explicit location permission. The first origin/radius is fixed for the session. Never move it silently on refresh.
6. For mobile-origin sessions, enforce GPS against the session origin/radius. Legacy sessions can use configured classroom coordinates. Do not bypass location checks or invent coordinates to make demos pass.
7. Students read their own attendance; staff reads require scope. Campus WebSocket subscriptions are admin-only. Query current database roles during authentication.
8. Professor reverse scans require an active existing session and student enrollment. Preserve the explicit out-of-batch audit marker.
9. Replay consumption is per `(nonce, student_id)`. A classroom code must support multiple enrolled students while blocking duplicate reuse by one student.
10. Consume nonces and write attempts/records inside one transaction. Publish notifications after commit. Keep accepted attendance from being downgraded by a later challenge.
11. Display credentials are scoped to paired QR access. Never send student records to classroom display sockets.
12. Keep native screenshot protection initialized before revealing app content, and keep privacy overlays from destroying application state.

## Database and test safety

Use `npm test` from the repository root. `tests/run-isolated.ts` sets test mode before importing application code; it uses in-memory PGlite regardless of `DATABASE_URL`. Do not import the ordinary runner in a live environment. Never use `npm run seed` as a verification shortcut on a user's database.

Append a new numbered SQL migration for schema changes. Do not edit an already deployed migration to upgrade an existing database; the migration ledger prevents replay. Historical migrations 006/008 have compatibility changes in this branch; review the completed-work record before changing them. Back up real data before applying migrations. Run the API from the repository root because SQL/public/data paths resolve from the working directory.

Do not run multiple processes against the same PGlite directory. Stop the API before running a standalone seed/migration command against that directory. Use external PostgreSQL for multi-process deployments.

## Required validation for substantive changes

```text
root: npm test; npm run build
admin-dashboard: npm run build
mobile: npm test; node node_modules/typescript/bin/tsc --noEmit
```

On Windows use `npm.cmd` when PowerShell blocks npm scripts. On POSIX set `npm_config_script_shell=/bin/sh` because the root `.npmrc` defaults to PowerShell. Add meaningful regressions for authorization, persistence, session identity and policy changes. Do not claim physical camera/GPS/screenshot testing from a browser screenshot or mocked test.

For APK changes, follow `docs/ANDROID.md`: preserve signing identity, bump `expo.version` and `android.versionCode`, set the current API URL, and force regeneration of the JS bundle when only an environment variable changes. Inspect the generated bundle for the expected hostname. Verify APK signature, version, architecture and any published download hash.

## Runtime operations

Inspect listeners and process command lines before restarting a server. Restart only a process positively identified as this project's API/Expo/tunnel. Prefer a new port over terminating an unrelated process. A tunnel URL is temporary runtime state; do not bake it into source defaults or treat an old doc link as live.

Do not print `.env` contents, access tokens, passwords from live systems or database exports into logs. `.env.example` may contain names and non-secret defaults only. Never commit APKs, private signing keys, tokenized tunnel configs, local databases or build caches. Keep demonstration credentials clearly labeled as demo-only.

## Continuing work

Prefer small coherent changes in shared API types, services and UI components. Update the relevant documentation when behavior changes. Keep user-facing copy simple: session name/time/room/professor/status, scanner and personal QR tabs. Missing course titles currently fall back to `Class session`; do not reintroduce batch names as the student-facing session title without product direction.

The backlog in `docs/WORK-COMPLETED.md` identifies unfinished production work. Do not describe planned features as implemented. Report exactly what was checked, limitations and changed files. Commit source and docs together when behavior changes, and preserve unrelated user configuration.
