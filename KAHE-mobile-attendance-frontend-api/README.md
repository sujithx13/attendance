# KAHE mobile attendance

**Updated workflow:** [Current mobile attendance rules](../docs/CURRENT-MOBILE-WORKFLOW.md) supersede the manual-start/GPS descriptions below. Scheduled sessions open automatically; teachers confirm out-of-time actions; students can show same-day passes; GPS checks are paused.

Expo SDK 57 / React Native 0.86 application for students and faculty. The repository root contains the backend; this folder does not run an independent API.

Start with the [main README](../README.md), [local setup](../docs/LOCAL-SETUP.md), [Android build guide](../docs/ANDROID.md) and [architecture](../docs/ARCHITECTURE.md). Development agents must also read [AGENTS.md](AGENTS.md).

```powershell
npm.cmd ci
$env:EXPO_PUBLIC_API_URL='http://localhost:4000/api/v1'
npm.cmd run web -- --port 8081
```

For a physical phone, use the reachable HTTPS API address. `localhost` on a phone refers to that phone. A standalone APK does not need Metro; the web/development preview does.

Students open a session to scan its classroom QR or select **My QR**. The app reloads attendance status from the API. Faculty start attendance using their current precise location and chosen radius, then show a classroom QR or pair a big screen. Faculty can also scan personal student passes.

Source layout:

- `App.tsx`: connection initialization, authentication and navigation.
- `screens/`: login, home, timetable, selected student session, scanner and profile.
- `components/`: session cards, personal pass, faculty QR, screen pairing, reusable controls and capture boundary.
- `lib/api.ts`: requests, response types and server connection handling.
- `lib/location.ts`: faculty precise-location acquisition.
- `lib/scanning.ts`: Hermes-safe QR decoding, timeout utility and outcome messages.
- `lib/connection-storage*`: persisted server address for native/web.
- `styles.ts`, `theme.ts`: shared visual styles and formatting.
- `tests/`: Vitest regressions.

```powershell
npm.cmd test
node node_modules/typescript/bin/tsc --noEmit
```

The npm package version is independent of Android's application version; release identity is in `app.json`. Current Android preview is 1.0.3 / code 4. Generated native projects and APKs are not tracked. See the Android guide for reproducible local builds, the Windows CMake path workaround and signing requirements.

## Vercel web deployment

The browser version of this mobile app can run on Vercel. The Node API and PostgreSQL stay on the VPS.

- Import PradFr/attendance into Vercel and set Root Directory to KAHE-mobile-attendance-frontend-api.
- Enable access to files outside the Root Directory: mobile TypeScript imports reference ../src/types. This repository has independent package lockfiles, not npm workspaces.
- Select Other as the framework preset. The checked-in vercel.json installs with npm ci, builds with npm run build:web, and publishes dist. It overrides the repository's Windows script shell for Vercel's Linux build.
- Web exports default to https://189.72.146.93/api/v1. To use another backend, set EXPO_PUBLIC_API_URL in Vercel for the required environments and redeploy. This address is public and bundled into browser JavaScript; never use a database URL or secret here.
- For a local export, run npm run build:web (on Linux, npm --script-shell=/bin/sh run build:web). The export script uses the same default API and respects an existing EXPO_PUBLIC_API_URL environment variable.
- SPA rewrites allow browser refreshes without breaking static asset URLs.

Open the deployed site on a phone to use the web app. Camera access requires HTTPS and browser permission. Native screenshot blocking and Android-specific behavior are not guaranteed on web. This deployment does not create an APK.

The backend must remain online with a valid HTTPS certificate and allow the deployed site's origin through CORS. The current backend permits cross-origin requests; if you later restrict it, include the production and intended preview origins. A previously saved Server connection address takes precedence over the bundled default: update that field at sign-in if this browser used an older backend.

Deployment checks: load the sign-in screen, confirm requests use the VPS /api/v1 endpoint, test student/faculty login with real accounts, refresh the page, and check camera permission on the actual phone. The administrator dashboard is a separate frontend.

## University branding

The supplied university artwork is stored in assets/university-logo.png and appears on the mobile and web sign-in screen. The app icon, Android adaptive foreground, and web favicon use proportionally scaled versions of the same artwork. White or transparent padding accommodates icon masks without stretching the logo. The admin dashboard uses the same supplied logo and a matching favicon. Native launcher icon changes require a new Android build; a Vercel redeployment updates the web branding.
