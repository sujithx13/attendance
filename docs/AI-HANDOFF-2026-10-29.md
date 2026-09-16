# Implementation and AI-agent handoff — 29 October 2026

## Delivery state

Implementation commit: `c81d836` on `codex/mobile-dashboard-scheduled-attendance`, based on `5562735`. This branch was pushed to `PradFr/attendance`. It has not been merged into `main`. This handoff describes work performed in this session; it does not establish production deployment or acceptance of a new Android build.

The source of truth for current behavior is [CURRENT-MOBILE-WORKFLOW.md](CURRENT-MOBILE-WORKFLOW.md). Read it before older architecture, setup or phone-testing notes. Those documents contain historical manual-start and GPS descriptions that the user explicitly superseded.

## User requirements and clarifications

The user requested the previous dashboard-style Home, concise timetable cards and role-specific session tabs. They clarified the timing and location requirements during implementation:

- Retain a dashboard Home rather than reducing it to a plain list of sessions.
- Timetable cards should show session name, time and saved attendance state, without professor/room details.
- Students open Scan classroom QR first, with My QR as the secondary tab.
- Faculty open Classroom QR first, with Scan student QR as the secondary tab.
- Teachers assigned to the batch must be able to display its QR and scan students even when not the named session professor.
- Sessions open at the scheduled time automatically, without a teacher start step.
- Outside scheduled hours, a teacher can display the classroom QR after a warning and explicit confirmation.
- Students can generate personal passes for any enrolled session on the same campus day, including upcoming and finished sessions.
- A teacher scanning a pass before/after its scheduled time must see a warning. If they explicitly continue, the student is marked present.
- Remove GPS from the current attendance workflow for now.
- Preserve clear successful, unsuccessful, pending and unconfirmed outcomes.

The historical comparison in [OLD-APP-AND-CHANGES.md](OLD-APP-AND-CHANGES.md) remains important: earlier requests to fix bugs did not authorize broad redesigns. The current changes implement the newly stated direction, not a claim that every visual detail has been accepted.

## Changes implemented

### Mobile Home and timetable

`Home.tsx` restores a green welcome panel, today's timetable snapshot, data-backed counts, enrolled/mentored batches and Quick Services. It uses the existing timetable polling hook and a separate authenticated batch request. Errors are visible instead of inventing successful empty results. Campus-day selection uses Asia/Kolkata.

`SessionCard.tsx` removes professor and room metadata. Students see persisted marked/pending/not-marked state; faculty see the QR action. Missing course titles still fall back to `Class session`. A dedicated session-title model was not added.

### Student and faculty sessions

`StudentSession.tsx` retains scanner-first navigation and a My QR tab. Personal passes can be shown for today's occurrence even when scanning is not currently open. Saved attendance is polled and refreshed on foregrounding. Once marked, the existing marked-attendance screen takes precedence over the tabs.

`ClassQrModals.tsx` replaces radius/location/manual-start controls with QR-first and scanner-second tabs. Opening invokes the session endpoint automatically. An out-of-time response prompts for explicit confirmation. The QR view refreshes its token, hides unavailable/expired images, retains browser-display pairing and polls the saved count of students marked present.

`UniversalScanner.tsx` no longer requests GPS. It preserves fixed camera framing, immediate scan lock, vibration, bounded network waits, session matching and persistent outcomes. A teacher's out-of-time response opens a confirmation dialog; continuing resubmits the same payload with `confirmOutsideSchedule: true`. Canceling returns to scanning without marking attendance. Expired tokens still fail normally, including if a person waits too long at the warning.

`lib/api.ts` carries machine-readable API error codes and confirmation flags. The Expo location permission plugin configuration was removed from `app.json`; installed dependencies and unused location utilities were retained. No new Android binary was generated.

### Scheduled daily occurrences

New `src/services/schedule.service.ts` creates/adopts today's occurrence for a timetable slot. Slot locking and a unique daily-occurrence index keep creation repeatable. Specific dates, weekly weekdays and effective dates are checked for ordinary automatic occurrences. Teachers may explicitly open another slot for today through the override path.

Migration `012_scheduled_attendance.sql` adds:

- `attendance_date`: daily occurrence identity.
- `scheduled_start_at` and `scheduled_end_at`: original timetable bounds, separate from an overridden active end.
- A unique partial index for `(timetable_slot_id, attendance_date)` where the date is populated.

Existing sessions are adopted lazily. When several old sessions exist, an adopted daily occurrence is preferred. Prior migration files were not rewritten. Back up real application databases before upgrade; migration 012 has been exercised in isolated PGlite, not on an institutional PostgreSQL deployment.

The server synchronizes schedules on startup and every 10 seconds. Context, QR and attendance paths also synchronize, so the workflow does not rely only on the timer. Start is inclusive and end exclusive. Completed sessions are not automatically reopened. Explicit teacher opening can reopen them.

A confirmed out-of-time classroom opening lasts up to two hours and is capped at campus midnight, unless the existing end is later. This duration is an implementation choice, not a separately requested product requirement; revisit if the user wants a different duration. A confirmed personal-pass scan marks only that student and does not open classroom scanning for everyone.

### Authorization, outcomes and persistence

Slot context and teacher opening now use batch-aware staff scope, consistent with the existing faculty timetable. Timetable-linked reverse scans also require that scope. Students remain enrollment-scoped. Non-timetable legacy sessions retain the existing audited out-of-batch professor scan path.

`OUTSIDE_SCHEDULE` warnings return before consuming a nonce or writing attendance. Confirmation does not bypass QR signatures, expiry, enrollment, current staff role, day checks or replay protection. Off-schedule teacher marking is recorded in notes. Nonces, attempts and official records remain transactional, with notifications after commit.

GPS policy is forced off in student flow generation and evaluation, including old origin/policy overrides. The professor flow also reports GPS disabled. Spatial utilities and historical columns remain available but are not active attendance requirements. Do not re-enable them merely because old documentation describes them.

## Validation actually performed

The following completed successfully after implementation:

| Check | Result |
| --- | --- |
| Root `npm test` | Backend integration/regression suites passed against isolated in-memory PGlite |
| Root `npm run build` | Passed |
| Admin `npm run build` | Passed |
| Mobile `npm test` | 28 tests passed across four files |
| Mobile TypeScript `tsc --noEmit` | Passed |
| Expo web bundle request | HTTP 200; updated JavaScript bundle compiled |
| API health, admin HTML and Expo HTML | HTTP 200 after service startup |
| Chromium UI smoke check | Student and faculty flows passed at a 360 × 800 viewport using isolated mocked API responses |
| Git diff whitespace checks | Passed before delivery |

Backend regressions cover automatic activation/completion, campus timezone boundaries, early/late warnings, explicit marking, no nonce consumption on warning, replay rejection after confirmation, same-day passes, persisted marked state, GPS-free attempts, batch-teacher access and unrelated-teacher denial. Existing tests for cryptography, transactions, authorization and browser display remain in the suite. Spatial utility tests remain utility coverage, not evidence that GPS is enabled.

Browser checks exercised dashboard Home, minimal timetable metadata, student My QR availability before class, faculty warning confirmation and secondary scanner navigation. These used mocked demo records and a placeholder QR image, not physical scanning or an end-to-end real-device attendance trial.

Preview screenshots and their limitations are in [previews/README.md](previews/README.md). The temporary browser-check script lived under `/tmp` and was not committed; do not assume it is available in another environment.

## Environment setup and preview delivery

The cloud setup used Node 24.19.0 and npm 11.9.0. Three independent `npm ci` installations succeeded using their lockfiles. On POSIX, `npm_config_script_shell=/bin/sh` is required because the tracked npm configuration selects PowerShell. Reusable install and startup instructions were saved in the environment configuration draft during onboarding. Saving a draft did not establish publication or fresh-task restoration.

Ignored local state included `.env` with privately generated development secrets, dependency directories, build outputs, Expo state and a local PGlite database. The application database was deliberately not seeded. Test fixtures were seeded only inside the isolated test runner. None of the secrets, database files or dependency/build caches were committed.

At the last runtime checks the API, admin and Expo web services were running on ports 4000, 5173 and 8081. Processes are temporary; inspect current listeners and command lines instead of assuming they survive. Start only one API owner against a PGlite directory.

Screenshot links and inline image delivery failed in this chat client. A Cloudflare Quick Tunnel was investigated, but the provisioning API returned HTTP proxy 403. The last observed runtime network policy had no custom domains and no outbound TCP grants. A configuration draft requested `api.trycloudflare.com` and `*.trycloudflare.com`; saving did not apply those settings to the running machine. No tunnel was established and no public preview URL exists. Cloudflare tunnel transport additionally needs supported outbound connectivity, typically TCP 7844 for HTTP/2. Do not claim that adding HTTPS domains alone establishes working tunnel transport.

Files and screenshots were instead committed and pushed to the separate GitHub branch. Users can download the branch ZIP or view its preview directory. Do not repeat inaccessible `/tmp` image links as if they were user-downloadable attachments.

## Guidance for the next AI agent

1. Read root `AGENTS.md`, mobile `AGENTS.md`, this handoff and the current workflow. Inspect branch, status and actual files before editing. Do not reset user work or replace this branch with `main` blindly.
2. Keep dashboard Home and concise timetable cards. Do not restore old session-start/GPS mechanics along with the old visual design.
3. Keep the distinction between a timetable slot, today's session occurrence, personal-pass availability, and open classroom scanning. A visible QR is not a saved attendance record.
4. Treat before/after-time confirmation as a server-enforced requirement. Preserve boolean confirmation, authenticated staff scope, token validation, transactionality and the non-consuming warning response.
5. Preserve campus timezone behavior, recurring/specific-date rules, daily identity and replay boundaries. Test time-boundary changes without relying on the wall-clock hour when tests run.
6. Never seed an existing user database for testing. Use root `npm test`, not the ordinary runner imported into a live process. Add new numbered migrations for future schema changes.
7. Read exact Expo SDK 57 docs before mobile edits. The documentation hostname was blocked here; the exact versioned source was accessible from the official `expo/expo` GitHub repository. Do not substitute older SDK assumptions or disable TLS verification.
8. Run the documented checks for substantive changes. Keep native, browser/mock and database-backend evidence separate. Do not claim a new APK from a web build.
9. Preserve preview signing identity for any future APK update, bump app version/versionCode, configure a reachable API and follow `docs/ANDROID.md`. The historical version 1.0.2/code 3 does not contain these new changes.
10. Finish with concrete delivery links and clear remaining limitations. A pushed branch is not a merge, a network draft is not applied policy, and a running local service is not a reachable public preview.

## Remaining work and limits

- Physical Android acceptance, including camera permissions, scanner success/failure, large fonts, screenshot protection and actual check-in persistence.
- Build/sign/distribute a new APK if requested. No APK for this change exists yet.
- A reachable demo preview/hosting path; Cloudflare access remains unverified beyond the observed denial.
- External PostgreSQL migration/transaction acceptance and load testing. The daily sync currently traverses active slots; evaluate cost before large institutional deployment.
- Review overnight schedules, overlapping classes, timetable edits after daily creation, multiple legacy occurrences and multi-replica scheduling before production. Current date-scoped passes deliberately follow the user's same-day requirement.
- Product decision on meaningful names for batch-only sessions and the duration of out-of-time classroom openings.
- Existing production backlog: real-account bootstrap/recovery, CORS/rate limiting, retention/privacy, durable hosting/backups and shared socket state for multiple replicas.
