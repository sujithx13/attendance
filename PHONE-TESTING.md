# Android phone testing

## Standalone app with an internet connection

The installed Android APK contains its own UI and scanner. It does not need Expo Go or a running Metro development server. The attendance API must be reachable from the phone over HTTPS.

The API is running on this computer on port 4000. The requested Cloudflare tunnel is active at `https://off-device-micro-fit.trycloudflare.com`. The database still includes demonstration accounts; this is a temporary testing deployment.

The connection is:

`Android APK -> public HTTPS tunnel -> local API on port 4000 -> local database`

The computer, API and tunnel must all remain online. Each temporary tunnel restart can change its public address. A regular hosted backend or stable managed tunnel is appropriate for ongoing use. An Expo development tunnel alone does not expose the attendance API.

The APK already points to the current HTTPS API address. If the tunnel address changes, open **Server connection** at sign-in and enter the new address. `/api/v1` is added automatically, and the new address is saved on the phone for the next launch. You can also set `EXPO_PUBLIC_API_URL` when building the app.

The standalone APK was built locally using the installed Android SDK and Gradle. It is at `artifacts/kahe-attendance-preview.apk` in the repository root and, with your approval, is available at `https://off-device-micro-fit.trycloudflare.com/downloads/kahe-attendance-preview.apk`. This is an ARM64 Android 7.0+ preview build, signed with the generated preview/debug key rather than a Play Store production key. It includes the current HTTPS API URL and does not require Metro or Expo Go.

The current APK is version **1.0.2**, Android version code **3**, and can update the previous build with the same signing certificate. The APK signature was verified. Its SHA-256 is `C2649DE86C125FFC56C33775DAEFE7A0B2AE209A2F641EEC5CF881CE57301F14`. Append `?v=3` to the download URL to fetch the new build.

This update uses a fixed scanner frame and zero camera zoom. Students confirm their presence before scanning. Detection vibrates once, displays progress, then keeps the server's result visible until **Done** or **Try scanning again** is chosen. Only an accepted server response displays **PRESENT**; review, rejection, and unconfirmed connection failures have separate messages. GPS and API waits have time limits. Android safe-area insets, content-aware bottom navigation, wrapping class metadata, a horizontally scrollable day selector, and scrollable dialogs address content being clipped on phones. Native camera, GPS and the device's particular screen/font settings still require a physical phone check.

For local Windows rebuilding, this build used `CMAKE_OBJECT_PATH_MAX=240` in the generated Android app's `defaultConfig.externalNativeBuild.cmake.arguments`, and `android.externalNativeBuild.cmake.buildStagingDirectory = rootProject.file('../../artifacts/cxx')`. These keep safe-area C++ object filenames within Windows limits. Reapply after regenerating the ignored Android directory.

`eas.json` also includes a `preview` Android APK profile if cloud builds are wanted later. The current APK was not uploaded to EAS.

## Big-screen classroom display

Version 1.0.2: faculty select a session, choose 25m/50m/100m, and tap **Start attendance here** on their phone. Grant precise location. The server fixes that phone location and radius for the session; opening/refreshing its QR cannot move the center. Existing sessions without a phone origin can be initialized through this flow. Classroom screen pairing uses this same session and center.

Students see only the session name, time, room, professor and **Marked present / Not marked / Pending approval**. Opening a session selects its scanner; **My QR** shows the personal pass for its actual active session. Status reloads from saved attendance, including professor scans and approvals. An unopened session explicitly waits for the professor. A GPS accuracy error reports the phone's uncertainty and is distinct from distance to the professor's starting point. Physical Android GPS/camera and screen-size validation still require the phone.

1. On the classroom computer, TV or projector browser, open `https://off-device-micro-fit.trycloudflare.com/display/`.
2. In the faculty app, open a lecture to start its attendance session and select **Show on big screen**.
3. Enter the eight-character code shown in the classroom browser and choose **Connect screen**.
4. The browser displays the current classroom QR and automatically rotates it. It needs no installed software and no faculty account sign-in.
5. Use **Disconnect screens** in the app or **Disconnect this screen** in the browser when finished. Ending the attendance session also ends display access.

Unclaimed codes expire after five minutes and can be claimed once. The display credential grants QR access only for the paired session; it cannot access account APIs or student check-in records. Normal screenshots on the phone remain protected.

## Demonstration accounts

All existing seeded demonstration accounts use `password123`:

| Role | Email |
| --- | --- |
| Faculty | `prof.alan@university.edu` |
| Student | `student.john@university.edu` |
| Student | `student.emily@university.edu` |

John belongs to the CSE Core Systems Lab Batch; Emily belongs to the AI & Robotics batch. Use a matching lecture and student account when testing enrollment checks. These are demonstration credentials, not production accounts.

## Screenshot protection

The native application initializes Expo ScreenCapture before displaying account data and QR passes. On Android it uses the operating system's secure-window protection to block normal screenshots and screen recordings, including recent-app previews. If native protection cannot initialize, the app keeps its content hidden and offers a retry. QR image downloads have been removed.

This needs an actual Android device test. Browser previews cannot enforce screenshot blocking. OS protection cannot stop another camera photographing the screen or guarantee protection on a compromised device.

## Phone checklist

1. Install the preview APK and enter the reachable HTTPS server address.
2. Sign in with separate student and faculty accounts.
3. Check that screenshots and recordings cannot capture the app, including QR dialogs and recent-app previews.
4. Verify camera and location permission prompts. Deny permissions once and check the displayed recovery path.
5. Create or select a classroom with real coordinates for the test location. The seeded demonstration coordinates are not your phone's location.
6. Start a class from the faculty timetable, then scan the classroom QR as an enrolled student. Both phones may use cellular data; the classroom/session rules still apply.
7. Scan the same classroom QR with a second enrolled student, then repeat with the first account to exercise replay protection.
8. Try the student's personal QR pass on the faculty scanner and check the admin's live attendance feed.
9. Close the app and confirm the server address is restored at next sign-in. Stop the local API and confirm the app reports a connection error rather than recording attendance.

Camera decoding takes place on the phone; final attendance validation and recording remain on the server.
