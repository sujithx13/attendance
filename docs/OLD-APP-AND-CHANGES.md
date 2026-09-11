# Earlier app, changed behavior and restoration reference

## Why this document exists

The user reported that the accumulated changes altered more of the app than they wanted and that the result was not satisfactory. A bug fix, technical refactor or request to clean up layout should not automatically be treated as approval of every broader product/design change. This document preserves the earlier experience and makes the differences reviewable before further work.

**No UI or runtime behavior is restored by this document.** It is a source-backed reference for deciding what to bring back. The old implementation's appearance can be restored selectively while retaining correct attendance, authorization, session identity and persistence behavior.

## Evidence and version boundaries

| Reference | What it represents |
| --- | --- |
| [`d206937`](https://github.com/PradFr/attendance/tree/d206937) | Earliest available committed full-stack app; mobile navigation included separate attendance, personal QR and analytics/history screens |
| [`4515ee8`](https://github.com/PradFr/attendance/tree/4515ee8) | Later mobile redesign with universal scanner, timetable, class-specific QR modals, profile view/edit and out-of-batch professor marking |
| [`56b3312`](https://github.com/PradFr/attendance/tree/56b3312) | Documentation checkpoint immediately before the accumulated fixes/refactor; primary comparison baseline in this document |
| [`0e50342`](https://github.com/PradFr/attendance/tree/0e50342) | Accumulated application fixes, mobile simplification, browser display, professor-location changes and detailed docs pushed together |

The main old mobile source is [`App.tsx` at 56b3312](https://github.com/PradFr/attendance/blob/56b3312/KAHE-mobile-attendance-frontend-api/App.tsx). Navigation is in [`lib/navigation.ts` at that checkpoint](https://github.com/PradFr/attendance/blob/56b3312/KAHE-mobile-attendance-frontend-api/lib/navigation.ts). The early navigation is [preserved separately at d206937](https://github.com/PradFr/attendance/blob/d206937/KAHE-mobile-attendance-frontend-api/lib/navigation.ts).

Descriptions below come from committed source and diffs, not newly captured screenshots or a claim that every old feature worked correctly on a physical phone. Git does not preserve every uncommitted intermediate version or establish which conversation turn motivated each individual line. The latest implementation combined several stages into one commit, so its diff alone cannot precisely date each change.

## Old mobile app at the main baseline: 56b3312

### Overall style and structure

The app used a KAHE green/emerald institutional theme, white cards, rounded corners, prominent green welcome panels, icon-led navigation, uppercase section kickers and more descriptive university/academic wording. It presented itself as a campus portal with multiple areas, rather than primarily a compact session list.

The signed-in header showed the account's initials/name and role, with profile and sign-out actions. A bottom dock exposed Home, Timetable (Schedule for faculty), Scan QR and Profile. The dock used overlay/absolute positioning. Screen components, QR dialogs, formatting helpers and the stylesheet mostly lived together in the large `App.tsx` file.

### Login

The mobile sign-in screen used the institutional branding and student/faculty role choice, university email and password fields, and wording such as **Sign In to Portal** / **Authenticating Session…**. It did not have the current persisted, editable server connection flow as a first-class setup control. The original API client assumed its configured/default endpoint rather than providing the current native connection recovery experience.

Restoration consideration: branding, wording and visual hierarchy are independent of backend URL configuration. The old visual style can coexist with the current connection control and production-safe demo-prefill behavior.

### Home: richer dashboard

The home screen had these visible groups:

1. **Welcome panel**: green hero card, decorative shapes, a student/faculty attendance tag, current date, “Welcome back” greeting and first name.
2. **Primary scanner action**: “Scan Classroom QR” for students or “Open Universal Scanner” for faculty.
3. **Today's Schedule / Timetable Snapshot**: first three timetable items for the weekday, with a Full Week link.
4. **Batch cards**: “My Enrolled Batches” for students or “My Mentored Batches” for faculty, an active counter, batch code/name, member count and description.
5. **Quick Services**: shortcut cards for Weekly Timetable, Universal Scanner and My Profile.

Schedule cards preferred the batch name/code when present, otherwise the course name/code. They showed a time tag, classroom and professor. Their call to action was “Show QR Pass” for students or “Broadcast QR” for faculty.

The data came from `getMyBatches` and `getMyTimetable`. The current reduction removed the welcome panel, enrolled/mentored batch section and shortcut grid from Home, replacing them with a compact today's-session list and weekly timetable action. **Faculty home also became simpler**, which is a wider change than merely removing student batch labels.

### Timetable

The weekly timetable had a Monday–Saturday segmented day selector and a Today indicator. The initial day was the current weekday, with Monday selected on Sunday. Empty states referred to teaching lectures or enrolled batches.

Each class card showed:

- A batch/course code pill.
- A time tag in 12-hour format.
- Batch name preferred over course name as the large title.
- Classroom and professor metadata with icons.
- An explicit role-specific button: **Show My Class QR Pass** or **Broadcast Live Class QR**.

Student action opened a personal QR modal directly; it did not first open the selected-session scanner with two tabs. The faculty action opened the live classroom QR modal.

### Student class QR modal

Opening a timetable item brought up a slide-in modal labeled **STUDENT ATTENDANCE PASS**, containing the batch/course title/code, class time, QR image, token lifetime text, professor-scanning instructions, **Refresh Token** and **Close** controls.

The source requested a pass when the modal opened and when Refresh Token was tapped. The text described it as a rotating token, but that component did not itself schedule periodic refresh. It passed `slot.id` as the session identifier with a fallback to an active-session constant; this distinction contributed to the need for correct slot-to-session resolution.

The current app replaces that direct modal with a session screen: scanner first, **My QR** tab second. The personal pass now uses the real active session, refreshes automatically, hides expired/error images and reloads status after professor marking. The older modal presentation can be restored without reintroducing the identifier/expiry problems.

### Faculty classroom QR modal

The old faculty modal was labeled **CLASSROOM LIVE BROADCAST**. It displayed the batch/course title and code, time, room, classroom QR and validity notice. Opening it called the slot launch API, then fetched an exported QR image.

It exposed validity choices of **5m**, **15m** and **1h**, plus **Export PNG** and **Done**. Web export downloaded a PNG; native export wrote a cached PNG and used the sharing API. The duration handler updated state and requested preparation in the same callback, so historical existence of the control does not establish that every chosen duration was correctly honored. The current API allows at most 900 seconds; the old 1h choice cannot simply be re-added against that contract.

The current modal instead offers radius choices and **Start attendance here**, captures the professor's precise location, displays a refreshing classroom code and offers **Show on big screen**. Faculty duration controls and PNG export were removed. The big-screen pairing feature did not exist in this old version.

Restoration consideration: visual layout, duration choice, export/share and geofence radius are distinct product choices. They should be reviewed individually rather than assuming one new feature must replace the others. Restoring QR export also needs a decision about how it should coexist with the user's request to protect phone content from screenshots/sharing and with QR expiry.

### Universal scanner and success feedback

The scanner was a camera-filling screen with an overlay: Back at the top, corner brackets and scan instruction text in the middle, and an error banner when necessary. It scanned classroom codes for students and personal passes for faculty.

There **was a success modal in the old code**. Student `ACCEPT` used “Attendance Recorded!” and “VERIFIED PRESENT”; faculty scans showed a marked-present message with the student's identity. The user's report that no success indication appeared should not be rewritten as “the old app had no success UI.” The source contained it; whether a failing scan actually reached it was a separate issue.

The scanner used a `submitting` flag to suppress repeated scans while a request ran, then reset it in `finally`. Errors could therefore be cleared/retriggered by repeated camera callbacks. It decoded with browser `atob` when present, acquired balanced GPS, substituted `{latitude:0, longitude:0, accuracy:10}` when coordinates were absent, and sent a hard-coded false mock-provider flag. These were implementation weaknesses, not visual preferences to restore.

The old corner frame was styled in the viewfinder overlay. The reviewed source does not establish a deliberate QR-bounds tracking algorithm; apparent movement could come from layout changes such as the error banner appearing. Do not describe the old source as having an implemented “QR chasing” feature without additional evidence.

The current scanner has a fixed square/zoom, presence confirmation before scanning, detection vibration, explicit progress, native-safe decoding, bounded waits, persistent outcomes and explicit retry. A full-screen visual camera treatment could be brought back while preserving those mechanics.

### Profile and confirmations

Profile had a read-only institutional details card with avatar, name, role, account/department/year information, plus explicit edit mode. Edit mode offered name, department and student year controls, save confirmation and cancel/reset behavior. Sign-out also used a confirmation dialog. Generic result and confirmation modals were part of the UI.

These concepts remain in the current code, now separated into screen/component files. A refactor into multiple files is not itself a removed user feature. Some error handling and responsive presentation changed, so exact styling should be compared before claiming pixel-for-pixel preservation.

## Earlier version: d206937

The earliest committed mobile navigation was different from the main baseline:

| Role | Tabs in d206937 |
| --- | --- |
| Student | Home, Scan, My QR, History, Profile |
| Faculty | Home, Live QR, Scan, Profile |

`App.tsx` included `StudentScanner`, `DecisionCard`, `PersonalQr`, `Analytics`, `FacultyQr` and `RosterScanner` components. The History tab was an analytics/attendance-summary entry point; it should not be assumed to have been a complete per-day chronological attendance ledger without examining that component further.

By 4515ee8/56b3312, separate top-level My QR/History navigation had already been replaced by timetable/class-specific passes and the universal scanner arrangement. Therefore **restoring the 56b3312 appearance will not restore the earliest History tab**. Restoring that feature requires deliberately bringing back or reimplementing the earlier analytics screen against current authorized endpoints.

The historical `todo.md` and `verification-notes.md` mix prototype stages. They are preserved with a historical notice, not treated as authoritative proof of current functionality or device verification.

## Old administration dashboard

The main baseline admin app had a prominent university-branded sidebar and longer executive/academic wording. Topbar titles included:

- Executive Campus Overview & Analytics.
- Student & Teacher Roster Directory.
- Batches & Cross-Disciplinary Cohorts.
- University Academic Departments.
- Timetable & Scheduling Matrix.
- Campus Live Telemetry & Disciplinary Audit.

The home overview used **Welcome to Karpagam Executive Portal**, a campus central hub badge, a semester label, summary cards, management shortcuts and campus/cohort notices. Buttons used wording such as **Generate Daily Sessions from Timetable**, **Manage Student & Faculty Directory**, **Configure New Cross-Dept Batch**, **Assign Timetable Template to Cohort**, and **Review Security Audit & Anti-Spoofing Feed**.

The changes shortened this language, simplified the sign-in page and layout, added a narrow-screen drawer, adjusted grids/modals and made live-monitor/overview status more data-backed. The core directory, batch, department, schedule-template and monitor sections remain. The old monitor mixed live data with hard-coded displayed metrics (for example a 48 count and named sample sessions), and socket setup lacked the current authenticated subscription behavior.

The executive appearance and terminology can be reinstated independently of fixing data accuracy, authorization, socket reconnection and small-screen overflow. Restoring the look does not require restoring fabricated counts or misleading “polling active” claims.

## Change matrix

| Area | Old baseline | Current implementation | Restoration option |
| --- | --- | --- | --- |
| Home | Welcome hero, schedule snapshot, batches, shortcuts | Compact session list | Restore hero/shortcuts independently; choose student/faculty batch visibility separately |
| Class title | Batch name preferred | Course name or `Class session` | Add a real session title; do not silently assume a generic title is satisfactory |
| Student session tap | Personal QR modal | Session scanner first, My QR tab | Choose direct modal, tabs or explicit separate actions while keeping real session identity |
| Attendance indication | Scanner success modal, no persistent card state | Saved marked/pending status on cards/screens | Keep persistent status with either visual design |
| Faculty QR | Auto launch, duration controls, PNG export | Explicit location/radius start, fixed validity, screen pairing | Review start behavior, radius and duration/export separately |
| Scanner appearance | Camera-filling viewfinder | Fixed camera square inside a scrollable screen | Restore full-screen camera style with stable overlay and robust result lock |
| Presence declaration | Not submitted in baseline scanner | Explicit pre-scan confirmation | Placement/copy can change; server-required declaration must remain satisfied |
| Location reference | Stored classroom coordinates/policy | Faculty origin/radius for mobile-started sessions | Keep the user-requested professor-origin behavior regardless of visual restoration |
| Big screen | No pairing page | Paired browser display | Retain alongside whichever faculty QR presentation is chosen |
| Profile | Institutional card and edit mode | Similar concepts split into modules | Restore specific styling without undoing the module structure |
| Admin branding | Executive portal wording/layout | Shorter labels, simpler layout | Restore branding/wording separately from live counts and responsive fixes |
| History | Present in earliest d206937, absent at baseline | No dedicated History screen | Reintroduce deliberately against current summary/record endpoints |
| Screenshot/export | PNG export present; no current native capture boundary | Native capture protection and no phone QR export | Explicitly resolve the protection/share tradeoff before restoring export |

## Requested changes versus broader choices

The conversation explicitly requested a static scanner frame, clear attendance outcomes, overflow fixes, Android screenshot protection, browser big-screen pairing, standalone APK/public download, a session scanner/My QR switch, simpler session details without student batch labels, and professor-origin radius checking. Those requests support corresponding behavior changes.

Some implementation choices went beyond the minimum needed for those requests and should remain open for revision:

- Removing the entire welcome hero and shortcut sections instead of only adjusting overflowing layouts.
- Applying the same broad Home reduction to faculty.
- Replacing institutional/executive copy across admin screens with shorter generic labels.
- Removing all visible class code pills rather than only unwanted batch names.
- Using a generic `Class session` fallback where a meaningful session title was missing.
- Replacing faculty duration controls with only the new radius/start controls.
- Choosing a specific full-page/tab layout and presence-checkbox placement rather than preserving more of the old presentation.

This is a scope comparison, not a claim that the user separately approved each of those choices. General requests to clean the UI or fix issues did not settle every design preference. The document's purpose is to make those decisions visible rather than present the latest design as final.

Some changes were technical corrections under the earlier code-review/fix request: transaction boundaries, per-student replay, role/scope checks, real session resolution, truthful outcomes and native-safe decoding. They should be preserved while revisiting visual/product choices. If a previous behavior was intentionally useful but unsafe or broken, reimplement its purpose against the corrected contracts instead of reverting the full backend.

## How to inspect or restore safely

Read-only source comparisons:

```sh
git log --oneline --all
git show 56b3312:KAHE-mobile-attendance-frontend-api/App.tsx
git show d206937:KAHE-mobile-attendance-frontend-api/lib/navigation.ts
git diff 56b3312 0e50342 -- admin-dashboard/src
git diff 56b3312 0e50342 -- KAHE-mobile-attendance-frontend-api
```

GitHub also provides the [full baseline-to-current comparison](https://github.com/PradFr/attendance/compare/56b3312...0e50342). Source links are pinned so later changes do not erase this reference.

Suggested restoration workflow:

1. Choose the target per area: earliest tabs, later dashboard, old faculty modal, old admin branding, or a combination. Avoid using “old app” as one unspecified target.
2. Create a new branch and keep the working database unchanged.
3. Restore only the chosen visual sections into the current modules; keep current API identity, access, transaction and expiry rules.
4. Preserve session-specific scanner/pass operation and professor-origin location unless the user changes those requirements.
5. Keep status visible and derived from saved records in the restored dashboard.
6. Add a real session-title model if generic titles are the issue, rather than reintroducing unwanted batch names.
7. Check narrow/short displays, large fonts, modal scrolling and camera overlays on a physical Android device.
8. Review the resulting experience before making further unrelated layout or terminology changes.

**Do not use `git reset --hard` or blindly copy the entire old App.tsx/backend over the current implementation.** That would mix incompatible contracts and can discard work. Checking out old code also does not reverse migrations or restore an old database. Use an isolated disposable database if running a historical checkout, and never seed it against the live database path.

## Current status of this request

This is documentation of the earlier application and differences. It records the user's dissatisfaction with excess changes and leaves the design decisions open. It does not claim that the simplified current UI has been accepted or that any restoration has already happened.
