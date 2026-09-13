# Current mobile attendance workflow

Updated 2026-10-29 following the user's revised requirements. This supersedes earlier manual-start and GPS descriptions in the historical phone notes and design comparison.

## Mobile layout

Home retains the dashboard layout: green welcome panel, today's schedule snapshot, live summary counts, enrolled/mentored batches and Quick Services. Timetable cards show only the session name, time and the student's saved attendance state (marked, pending or not marked). Faculty cards open the classroom QR. Professor and classroom metadata are omitted from timetable cards.

Students open a session with **Scan classroom QR** selected and **My QR** as the second tab. Scanning is available while attendance is open. A personal pass is available before or after class for an enrolled session on the same campus day. A pass does not mark attendance on its own. Saved marked/pending state is polled and refreshed on foregrounding.

Faculty open a session with **Classroom QR** selected and **Scan student QR** second. All teachers assigned to the batch, including its primary teacher and additional `batch_professors`, can display its classroom QR and scan enrolled students. Teachers outside that scope cannot access timetable-linked sessions. The legacy audited out-of-batch scan path remains only for sessions without timetable links.

Scanner detection stays locked until an explicit retry. Accepted, pending, rejected and unconfirmed network results stay distinct. The teacher's QR view polls the saved count of students marked present; its scanner shows the individual result. Native screenshot protection remains enabled.

## Schedule and confirmation

Campus calendar dates and times use **Asia/Kolkata**, independently of the host/device timezone. The API creates today's occurrences for active timetable slots, respecting specific dates, recurring weekdays and effective dates. A server timer synchronizes status every 10 seconds; context/QR/attempt requests also synchronize. No teacher start button or location fix is required.

A session opens during its scheduled interval, inclusive of start and exclusive of end. Teachers opening the classroom QR outside that interval see a warning and must explicitly continue. A confirmed opening enables classroom scanning for up to two hours, capped at campus midnight (or the existing later end). Reopening during the scheduled interval uses the timetable end. Completed sessions do not reopen through the automatic timer.

Students may generate fresh personal QR passes for any of today's enrolled sessions, including upcoming or finished sessions. A teacher scanning outside the scheduled interval receives `409 OUTSIDE_SCHEDULE`; explicit confirmation resubmits the same pass and marks the student present. The warning consumes no nonce and writes no attendance. Tokens still expire normally, and enrollment, staff scope, session identity and replay checks remain enforced. Old-day passes cannot be issued or accepted through this path. Confirmation outside scheduled hours is recorded in attendance notes.

## GPS paused

The app no longer requests location for attendance, and the API forces `requiresGps: false`, including when an older session has a GPS override/origin. No location evidence is required to accept a valid classroom scan. Existing location columns, utilities and dependency packages are retained for a possible future feature; their presence does not mean GPS enforcement is active. Native location permission configuration was removed. BLE/biometric policies still require supported evidence or professor verification.

## API changes

- `POST /sessions/launch-slot`: `{slotId, batchId?, confirmOutsideSchedule?: boolean}`. Used automatically when the teacher opens the session. Returns `OUTSIDE_SCHEDULE` until explicit confirmation outside scheduled hours.
- `POST /attendance/professor-scan`: adds `confirmOutsideSchedule?: boolean`. Only `true` confirms the warning.
- `GET /attendance/student-qr`: supports a slot or today's actual session ID, regardless of whether its scheduled interval is open.
- `GET /sessions/for-slot/:slotId`: returns today's occurrence and saved attendance; `sessionActive` remains separate from personal-pass availability.
- Migration **012** adds daily occurrence identity and original scheduled bounds, keeping out-of-time openings separate from the timetable window. Existing session data is adopted without rewriting older migrations.

## Validation and limits

Run root `npm test` and `npm run build`, admin `npm run build`, and mobile `npm test` plus `node node_modules/typescript/bin/tsc --noEmit`. The backend suite checks scheduled boundaries, warnings before/after class, explicit confirmation, no nonce consumption on warning, same-day passes, saved status, GPS-free attempts and batch-teacher access.

Web layout and mocked UI checks cannot establish physical camera operation or native screenshot protection. No new APK or deployment is produced by this source change. Back up existing application data before applying migration 012; use the isolated test runner for validation.
