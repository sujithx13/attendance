# Local installation and operation

## Prerequisites

- Git, Node.js 22.13+ and npm. Use an actively supported Node release compatible with the lockfiles; Expo SDK 57 requires at least Node 22.13.
- Three terminal windows for the API, admin dashboard and Expo preview.
- Android phone and internet access for native testing; Android SDK/JDK only if building locally.
- External PostgreSQL is optional. Without `DATABASE_URL`, the API creates a local PGlite database.

Commands below assume you are at the repository root unless another working directory is stated.

## 1. Clone and install

```powershell
git clone https://github.com/PradFr/attendance.git
cd attendance
npm.cmd ci
Push-Location admin-dashboard
npm.cmd ci
Pop-Location
Push-Location KAHE-mobile-attendance-frontend-api
npm.cmd ci
Pop-Location
Copy-Item .env.example .env
```

For Linux/macOS:

```sh
git clone https://github.com/PradFr/attendance.git
cd attendance
export npm_config_script_shell=/bin/sh
npm ci
(cd admin-dashboard && npm ci)
(cd KAHE-mobile-attendance-frontend-api && npm ci)
cp .env.example .env
```

The shell override is necessary because the tracked root `.npmrc` specifies `powershell.exe`. Do not delete lockfiles to resolve an install issue. Native Android build downloads need network access to the official Gradle/Android/Maven repositories.

## 2. Configure the backend

Edit `.env`, which is ignored by Git:

```dotenv
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=
JWT_SECRET=
QR_HMAC_SECRET=
```

Generate two separate secrets locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and paste one into each secret setting. Blank secrets work in development but change every process restart, invalidating previous logins and QR tokens. Production requires values of at least 32 characters.

| Setting | Meaning |
| --- | --- |
| `DATABASE_URL` blank | Embedded database directory at `data/attendance.db/` |
| `DATABASE_URL` set | `pg` pool connects to external PostgreSQL using that connection string |
| `HOST` | Bind address; use `127.0.0.1` for loopback-only operation or `0.0.0.0` when intentionally exposing an interface |
| `PORT` | API and WebSocket listener, default 4000 |
| `JWT_SECRET` | Login and derived display-token signing root |
| `QR_HMAC_SECRET` | Attendance QR payload signing key |
| `QR_ROTATION_INTERVAL_SECONDS` | WebSocket classroom QR rotation, default 15 |
| `QR_EXPIRATION_SECONDS` | Default classroom QR token lifetime, default 20 |
| `MAX_REALISTIC_SPEED_METERS_PER_SEC` | Velocity anomaly threshold |

The env module also exposes geofence/accuracy/biometric settings. Attendance policy defaults are currently defined separately in `src/config/constants.ts` (25m distance, 35m student GPS accuracy). Do not assume changing every similarly named environment variable changes policy evaluation: inspect the actual consumer. Mobile-origin sessions override the distance with their stored radius and enforce GPS. Faculty origin acquisition requires accuracy of 50m or better and a location no older than 60 seconds.

## 3. Initialize a disposable demo

Before the first API start:

```powershell
npm.cmd run seed
```

Seeding runs migrations and inserts/updates demonstration users, courses, rooms, enrollments, batches and schedules. It can update existing data and passwords. Use it only for a new disposable installation. Do not run seed and API processes simultaneously against one PGlite directory.

For an existing database, start the API and let its migration ledger apply outstanding migrations; do not reseed. Back up data before schema upgrades. Explicit migration command: `npm.cmd run migrate`, with the API stopped when using PGlite.

## 4. Run the API

```powershell
npm.cmd run dev
```

For a compiled run:

```powershell
npm.cmd run build
npm.cmd start
```

Always use the repository root as the working directory: migrations, static display files, database and optional APK path resolve relative to it. A deployment containing only `dist/` is incomplete.

Check `http://localhost:4000/health`. This confirms the process is serving requests; it is not a full database readiness or production monitoring probe.

## 5. Run the dashboard

```powershell
cd admin-dashboard
npm.cmd run dev
```

Open `http://localhost:5173`, log in as `admin@university.edu` / `password123` on a seeded demo. Vite proxies `/api/v1` and `/ws` to port 4000. The dashboard uses relative API URLs; changing the backend port also requires updating its proxy target.

`npm.cmd run build` produces `admin-dashboard/dist/`. `npm.cmd run preview` previews a static build but is not the documented production API proxy. Use the reverse proxy configuration in the deployment guide when serving built files.

## 6. Run the mobile web preview

```powershell
cd KAHE-mobile-attendance-frontend-api
$env:EXPO_PUBLIC_API_URL='http://localhost:4000/api/v1'
npm.cmd run web -- --port 8081
```

Or put the URL in an ignored `.env.local`. Do not copy the example domain literally; replace it with your API. Restart Expo after changing build-time environment settings.

Use a student/faculty demo account. The app's server connection control accepts the origin with or without `/api/v1`; it normalizes and saves the result. Web uses localStorage; native uses a FileSystem-backed setting. Installing a new build can replace a saved old `trycloudflare.com` preview URL with its newly bundled preview URL; other saved custom endpoints remain selected.

Browser camera/location features depend on secure contexts and browser permission support. An HTTP LAN preview may display the interface while camera/GPS access fails. Native Android testing is required for a complete result.

## 7. First attendance test

1. Ensure the student is enrolled in the course or batch of the chosen timetable slot.
2. Sign into the faculty app and open that slot. Pick 25m/50m/100m, allow precise location and start attendance at the intended location.
3. Keep the faculty location center in mind if moving the phone later; refresh does not relocate the session.
4. Show the QR to the student directly or pair `/display/` on a separate screen.
5. Open the same session as the student, confirm physical presence and scan. Use **My QR** for professor scanning instead.
6. Confirm the result and the reloaded session status. A review request is pending until staff approves it.
7. Test an out-of-radius scan and a poor-accuracy fix. Neither should display successful attendance.

Class attendance can be started from a weekly timetable slot for testing even when that weekday is not today; launch currently opens a two-hour active session. This is current behavior, not enforcement of the published lecture time.

## Ports and process recovery

On Windows:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 4000,5173,8081
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine
```

Identify the command before stopping any process. Do not kill all Node processes. A changed API port must also change the admin proxy and mobile API address. A changed frontend port changes only the browser entry address.

On POSIX, use `lsof -i :4000` or your platform's listener inspection tool, then inspect the identified process. Keep runtime output visible during diagnosis.

## Common failures

| Symptom | Check |
| --- | --- |
| Phone cannot reach `localhost` | On the phone it means the phone itself; use reachable HTTPS or an explicitly configured LAN address |
| Old tunnel no longer resolves | Restart tunnel, use its newly printed address, update the phone setting or rebuild |
| Camera unavailable in browser | Permission, secure context and whether another application owns the camera |
| Student QR unavailable | Professor must start an active session; check enrollment and actual session resolution |
| QR refresh/error loop | Inspect API error; stale/expired images are intentionally hidden |
| `300m > 35m` accuracy error | Enable precise location and improve satellite/network fix; it is location uncertainty |
| Distance exceeds radius | Check the professor's captured session origin and selected radius |
| Pending approval | GPS/sensor/policy verification needs professor review; no automatic present claim |
| PowerShell blocks npm | Use `npm.cmd`; project scripts invoke Node entry points |
| POSIX says PowerShell missing | Export `npm_config_script_shell=/bin/sh` |
| PGlite database is busy | Use one owner process; do not run API/seed/migrate simultaneously |
| Login invalid after restart | Configure stable JWT/QR secrets instead of random development defaults |

## Stop and back up

Use Ctrl+C in each server terminal. The API handles SIGINT/SIGTERM and closes its database. Stop it before copying the entire `data/attendance.db/` directory as a PGlite backup. Restore to a separate directory and test before replacing a working database. External PostgreSQL uses normal database backup/restore tooling.
