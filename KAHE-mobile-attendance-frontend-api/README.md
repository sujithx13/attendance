# KAHE mobile attendance

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

The npm package version is independent of Android's application version; release identity is in `app.json`. Current Android preview is 1.0.2 / code 3. Generated native projects and APKs are not tracked. See the Android guide for reproducible local builds, the Windows CMake path workaround and signing requirements.
