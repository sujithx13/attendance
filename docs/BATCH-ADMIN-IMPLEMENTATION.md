# Batch administration workflow — 29 October 2026

Implemented in this change:
- Admin directory uses an institutional email local part with fixed `@kahedu.edu.in` domain, year labels, register number and phone number. User create/update validates the email domain. Existing addresses are not silently rewritten.
- Semester badge, manual session spawner controls, department bulletin navigation, batch announcement navigation and the multi-year checkbox are removed.
- Batches open as full-page details with timetable, daily attendance, login access and account alerts. Global live-monitor navigation now opens batches.
- Daily attendance lists name, register number, department, email, phone and each session result. Select a session and use present/absent checkboxes; pending and upcoming sessions remain explicit. Unmarked ended occurrences are absent. Attendance uses the current roster eligible by enrollment date plus students with recorded attendance; deleted memberships without historical records cannot be reconstructed.
- Day templates select a source weekday and apply it to selected recurring weekdays (including every day) or specific dates. Application is transactional and rejects overlapping batch, teacher or room schedules. Template subject names are retained in the report.
- Excel export creates `.xlsx` with the complete daily roster and all session columns, preserving register/phone strings and leading zeros. ExcelJS is loaded only when exporting.
- Mobile authentication is persisted in browser storage/native app-private storage, scoped to the selected server. Mobile sessions have no automatic time expiry; the API checks revocable session records. Stable JWT configuration is required across server restarts. Closing/reopening the app preserves sign-in; clearing application storage or deleting the account does not.
- Account details are read-only in the mobile app and the profile API rejects edits. Settings exposes logout only under **For testing**. Logout must succeed on the API before the client clears its saved authentication. The API revokes the session and records a logout event for every associated batch.
- Each batch has **Allow all logins**, initially enabled. When disabled, valid credentials create a pending login request. An administrator approves the request; the user signs in again. Approval is consumed by successful sign-in. Users in several restricted batches need approval for each. Existing sessions remain valid when the switch is turned off. Incorrect credentials never create requests.
- Batch login requests and account alerts refresh every five seconds. Daily attendance also refreshes every five seconds. Alerts are stored durably per batch.

Migrations 013–015 add phone numbers, mobile sessions, login gate/requests/account events, and timetable subject names. Back up PGlite while its API owner is stopped before upgrade. The local database was backed up and migrated without reseeding.

Verification: root TypeScript compilation and isolated backend suite; new regressions for approval consumption, allow-all, logout revocation/events, locked profile, daily report, day-template copies and atomic conflict rollback; admin build; 30 mobile tests and mobile TypeScript check; Excel workbook round-trip preserving leading zeros. Native device lifecycle, camera and OS storage behavior require physical device acceptance testing.

## Batch window UI

Opening a batch launches a separate dashboard window (or tab, depending on browser settings) using its batch ID in the URL. The window reuses the main administration sidebar, topbar, spacing and visual tokens. Its sidebar provides Batch overview, Students, Faculty, Batch timetable, Daily attendance, Alerts & login access, General timetable and Batches. General timetable includes the existing timetable/template page, initially filtered to the selected batch. All existing controls and API behavior are retained; policy details are collapsed under Batch rules.
