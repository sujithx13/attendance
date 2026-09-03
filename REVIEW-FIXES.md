# Attendance review fixes

## Access and attendance rules

- Creating accounts through `/auth/register` requires an administrator. The admin directory remains the normal account management UI.
- Attendance reads are restricted to the student's own rows or the professor's assigned sessions. Only administrators may read the campus stream.
- WebSockets require `{ "type": "SUBSCRIBE", "sessionId": "CAMPUS", "token": "<JWT>" }` for administrators, or an assigned session ID for professors. Students cannot request classroom broadcasts. Reconnect after a token expires.
- Challenge resolution requires session access and a pending challenge that still owns the current attendance record. Existing present records cannot be downgraded by a subsequent challenged scan.
- Professor scans require an existing, active, unexpired session and student enrollment. Out-of-batch professor scans remain supported, explicitly recorded as `PROFESSOR_OUT_OF_BATCH`.
- Face enrollment is an administrator operation with `userId` and a finite, nonzero 128-number `embedding`.
- Attendance attempts must include `declarationAccepted: true` when session policy requires the presence pledge.
- Client-supplied IP addresses and forwarded headers do not establish classroom network presence. The connection's actual peer address is used.

## Database and startup

Migrations are discovered by numbered filename and recorded in `schema_migrations`. Existing databases with the version-007 schema are adopted without replaying the previous data backfills. Migration 008 widens `marked_by`; migration 009 scopes replay protection to `(nonce, student_id)` and associates sessions with timetable slots. New installs run all migrations.

Attendance writes use one transaction, with a dedicated PostgreSQL connection or PGlite transaction. Notifications are sent after commit. A failed write rolls back QR consumption and all attendance changes.

The usual `npm test` now launches an isolated in-memory database regardless of `DATABASE_URL`. Running the seed command itself still changes the configured application database. Tests do not seed the live database.

Production requires independently configured `JWT_SECRET` and `QR_HMAC_SECRET`, each at least 32 characters. Replace development secrets before deployment. Production sign-in screens do not prefill demonstration credentials.

## Clients

The admin monitor uses live counts, subscribes to authenticated events, reconnects after disconnection, polls every 15 seconds, and reports refresh failures. Empty results do not claim that failed requests are healthy.

The mobile application is separated into `screens/`, `components/`, `theme.ts`, and `styles.ts`. Attendance request and flow types are shared with the backend. Flow and authentication responses are validated before use. The scanner loads session policy, asks for the presence declaration, reports native mock-location status when provided by the device, and omits unavailable GPS coordinates. Personal QR passes resolve to an active session and refresh automatically.

Native builds require `EXPO_PUBLIC_API_URL`, or a server address entered at sign-in. Web development defaults to the browser hostname on port 4000. Production should configure an HTTPS API URL explicitly.

## Remaining platform limitations

Client GPS, BLE, and mock-location flags are device-reported signals, not hardware attestation. Cosine comparison alone does not provide face detection or liveness. The mobile scanner routes policies requiring unsupported biometric/BLE capture to a professor's in-person verification rather than claiming those checks succeeded. Actual native camera/GPS capture must be checked on a physical device before deployment.

Automated regressions cover HTTP authorization, shared QR behavior and concurrent replay, transaction rollback, migration replay, closed-session scans, out-of-batch auditing, WebSocket authentication, challenge ownership, and batch-session visibility. PostgreSQL connection handling compiles; database regressions run against PGlite.
