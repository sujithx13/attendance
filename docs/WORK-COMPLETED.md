# Work completed and handoff status

For the detailed latest implementation, validation evidence, delivery state and next-agent guidance, read [AI handoff — 29 October 2026](AI-HANDOFF-2026-10-29.md).

**Updated workflow:** [Current mobile attendance rules](CURRENT-MOBILE-WORKFLOW.md) supersede the manual-start/GPS descriptions below. Scheduled sessions open automatically; teachers confirm out-of-time actions; students can show same-day passes; GPS checks are paused.

Updated 2026-10-29. This describes the source included in this repository, not a promise that a temporary tunnel remains online.

**Design acceptance:** the user has reported that some changes exceeded the requested scope and the resulting UI is unsatisfactory. Implemented does not mean accepted. Read [Old app and change comparison](OLD-APP-AND-CHANGES.md) for the source-backed earlier experience, broader choices and restoration guidance. No restoration is claimed by this record.

## Starting application and administration

The project already contained Node/TypeScript attendance services, academic management, PGlite/PostgreSQL adapters, an admin dashboard and an Expo app. The accumulated changes preserve those features while correcting authorization, attendance consistency, native behavior and setup reliability.

Administration supports departments, courses, users, classroom configuration, batches/cohorts, enrollment, staff assignment, timetable slots/templates, announcements, session management, analytics and a live monitor. The admin dashboard remains a frontend calling the separate API.

## Security and data-integrity corrections

- Account registration now requires an authenticated administrator.
- Authentication checks the database's current role, avoiding reliance solely on an old JWT role claim.
- Student reads are self-scoped; professor reads use session/course/batch ownership scope. Campus socket subscriptions require admin access.
- Professor scans require existing active/unexpired sessions and enrollment; intentional out-of-batch marking has an explicit audit source.
- Challenge resolution verifies pending/current-record ownership and cannot silently overwrite an accepted record with a later challenge.
- QR replay uniqueness changed from a global nonce to `(nonce, student_id)`, allowing a shared classroom code to serve multiple students.
- Attempts, official records, violations and nonce consumption are transactional. Notifications are published after commit; failed writes roll back.
- PostgreSQL transactions use a dedicated pool connection; PGlite uses its transaction API through the same abstraction.
- Migration filenames are ledger-recorded; old version-007 installations are adopted without replaying prior data backfills.
- Session launch is idempotent for a slot's active session and records `timetable_slot_id`.
- Session reads support batch sessions whose course is null through left joins.
- Peer IP is server-observed rather than trusting client-provided forwarded/IP telemetry.
- Production requires configured JWT/QR secrets; development can use random per-process values.
- Tests use an isolated in-memory PGlite database regardless of the live `DATABASE_URL`.

## Mobile refactor and UI

- Split the large application into screens, reusable components, API/storage/scanning/location helpers, styles and theme.
- Added configurable persisted backend connection and shared request/flow types.
- Native screenshot protection initializes before content; inactive privacy overlays keep children mounted rather than losing application state.
- Removed QR image download actions from the phone UI.
- Added actual Android safe-area handling, non-overlapping bottom navigation, wrapping text and scrollable dialogs.
- Replaced moving/detection-dependent scanner presentation with a fixed square/zoom, immediate lock and vibration, progress and persistent outcomes.
- Added bounded GPS/API waits and distinct present/pending/rejected/unconfirmed messages. A decode event alone never indicates saved attendance.
- Simplified home and timetable cards to session name, time, room, professor and saved attendance status; removed student batch lists/broadcast labels.
- Tapping a session opens a session-bound scanner; **My QR** displays a personal pass for the actual active session.
- Added explicit waiting state for unopened sessions and clear QR/image failures instead of an indefinite placeholder.
- Personal QR passes refresh, clear expired images, use explicit responsive dimensions and reload after foregrounding.
- Timetable and session status poll saved records, including professor reverse scans and challenge approval outcomes.
- Better GPS messages distinguish accuracy uncertainty from distance and explain precise-location recovery.
- Quick-tunnel address migration helps a new preview APK replace an expired previously saved preview address.

## Faculty origin and geofence

- Migration 011 adds session latitude, longitude, accuracy, radius and captured timestamp.
- Faculty choose 25m/50m/100m and explicitly start attendance using their current precise phone location.
- The server validates freshness, coordinate ranges, precision, radius and a reported mock-location flag.
- The first location/radius stays fixed for the session. Refresh/reopen cannot silently relocate attendance.
- Mobile-origin sessions use this radius/center and require GPS. Legacy sessions retain classroom-based location behavior.
- The phone uses high-accuracy acquisition; poor fixes are not cached as successful precise readings.

## Big-screen browser

- Added `/display/`, served directly by the API without installation on the big-screen device.
- Added expiring, one-use pairing codes claimed by faculty for an owned active session.
- Browser receives a limited display token, subscribes for rotating QR, clears stale codes and reconnects.
- Added disconnect/revocation/session-state checks; display sockets do not receive student attendance information.
- Added pairing rate limits and restrictive static response headers.
- Real HTTP/WebSocket integration tests cover pairing ownership, expiry, revocation and privacy.

## Builds and operations

- npm scripts use Node entry points to avoid PowerShell `.ps1` execution-policy failures.
- Admin build script runs TypeScript and Vite through Node.
- Added mobile environment example, EAS APK profile and setup/testing documentation.
- Generated native folders, local artifacts, databases, logs and environment secrets are excluded from Git.
- Built standalone ARM64 Android preview APKs locally, with native screenshot protection and no Metro dependency.
- Latest preview is 1.0.2 / code 3, signed with the same preview certificate as its predecessor.
- Verified signature/version/ABI and full public download SHA-256; caught and corrected Gradle reusing an old JS bundle after the API URL changed.
- Temporary Cloudflare forwarding was used to reach the locally hosted API from phones. No permanent Cloudflare Worker, stable hostname or production hosting was created.

## Schema history

| Migration | Purpose |
| --- | --- |
| 001–003 | Core users, rooms, courses, sessions, attendance/audit/nonces and materialized views |
| 004 | Departments, batches and timetable model |
| 005 | Templates, announcements and CRUD support |
| 006 | Historical course/detail compatibility fixes |
| 007 | Multiple batch professor assignments |
| 008 | Audited out-of-batch professor marker support |
| 009 | Per-student replay key and timetable/session relationship |
| 010 | Browser classroom display pairings |
| 011 | Fixed faculty-origin geofence fields |

## Verification evidence and limits

The backend suite passed with QR, spatial, telemetry, biometrics-comparison, policy/flow, batch/timetable, security/integrity, display and session-experience regressions. New session tests verify that the professor origin is actually enforced, a far student is rejected for distance, poor accuracy is rejected for accuracy, an inside student is accepted, personal passes resolve to real sessions and saved status reflects professor marking.

The mobile suite passed 28 tests. Mobile TypeScript, backend compilation and the admin production build passed again while preparing this documentation and GitHub push. Use the documented full checks for each release. Browser layouts and classroom pairing were visually exercised during development. User phone testing established that the display/scanner paths operated before the final refinements.

**Not established by those checks:** full native acceptance of the final APK on every phone/font size, reliable indoor GPS across devices, production PostgreSQL parity/load, face liveness, BLE acquisition, multi-replica behavior or institutional production readiness. Do not convert these into completed claims.

## Next work, in priority order

1. Physical Android acceptance of final scanner/pass/status/location behavior and narrow/large-font layout.
2. Stable hosting/domain and service supervision so stopping the development PC does not interrupt attendance.
3. Secure first-admin bootstrap, credential recovery and production account lifecycle.
4. Production CORS/rate limiting, token-storage review, privacy/retention policy and backup restore drills.
5. External PostgreSQL migration/transaction tests and burst-load testing.
6. Explicit session titles for batch-only slots; current student UI falls back to `Class session` if no course title exists.
7. Review launch-time policy (currently any selected slot can be launched for two hours) and audited out-of-batch marking against institutional rules.
8. Automate the Windows native build path workaround in a config plugin and add a repeatable signing/release pipeline.
9. If required, implement actual mobile biometric/liveness/BLE capture with reviewed server contracts rather than relying on existing scaffolding.
10. Shared rate limiting, socket fan-out and migration coordination before multi-instance deployment.

## Related historical notes

[REVIEW-FIXES.md](../REVIEW-FIXES.md) records the earlier review corrections. [PHONE-TESTING.md](../PHONE-TESTING.md) is a local preview snapshot with an APK hash and temporary URL, not a permanent service locator. The maintained setup/build guides should be used for a fresh checkout.

## Input focus and overview follow-up

The admin modal now initializes focus only when it opens. Updating an inline close callback while typing no longer tears down the focus effect and focuses the dialog again; Escape uses the latest callback and closing restores the previous focus/scroll state. The overview no longer fetches or displays campus notices. Department/batch notice tools remain available.

Mobile login, profile and modal forms explicitly retain keyboard taps and disable scroll-triggered keyboard dismissal. These settings address keyboard interaction; native-device confirmation of the reported typing issue is still required.
