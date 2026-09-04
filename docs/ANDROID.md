# Android build, distribution and acceptance testing

## Modes

| Mode | Requires Metro? | Purpose |
| --- | --- | --- |
| `npm run web` | Yes | Browser layout/navigation preview |
| Expo development launch | Yes | Development; native module availability depends on the development client |
| Standalone release-bundled APK | No | Installable phone preview with its UI bundled |

The APK always needs the backend for sign-in and final attendance recording. It does not contain a local attendance database or offline attendance authority.

Current native configuration: application ID `edu.kahe.attendance`, version 1.0.2, version code 3, Expo SDK 57 and React Native 0.86.3. The tested preview build targets ARM64, Android 7.0+ (min SDK 24), compile/target SDK 36. APK output is ignored by Git.

## Prerequisites

Install Node/npm, Android Studio/SDK, Java and Android build tools. The Windows preview was built with JDK 21, Android SDK/build-tools 36.0.0, NDK 27.1.12297006, Gradle wrapper 9.3.1 and Kotlin 2.1.20. These describe the verified local toolchain; generated Expo build files remain the authority for exact requirements.

Set `ANDROID_HOME` to your SDK and `JAVA_HOME` to your JDK. Paths in the commands are examples to replace. Do not commit machine-specific SDK paths or signing credentials.

## 1. Install and configure

From the mobile directory:

```powershell
npm.cmd ci
$env:EXPO_PUBLIC_API_URL='https://YOUR-REACHABLE-HOST/api/v1'
$env:NODE_ENV='production'
```

The public API URL is not a secret, but should be an actual reachable host. `EXPO_PUBLIC_*` values are embedded in client code and must never hold credentials. An ignored `.env.local` can hold the development URL.

Update both `expo.version` and `expo.android.versionCode` in `app.json` for a new Android release. The npm package version is separate. Increasing version code and preserving the signing certificate allows installation over the previous build.

## 2. Generate the native project

```powershell
node node_modules/expo/bin/cli prebuild --platform android --no-install
```

`android/` is generated and ignored. Prebuild can regenerate/clear native files; back up needed signing material securely first. Any manual generated-file workaround must be reapplied after regeneration. Do not assume a locally edited Gradle file is tracked source.

### Windows long-path workaround

Building `react-native-safe-area-context` from this repository's long directory name can hit Ninja's 260-character object filename limit. In generated `android/app/build.gradle`, add to `android { ... }`:

```groovy
externalNativeBuild {
    cmake { buildStagingDirectory rootProject.file('../../artifacts/cxx') }
}
```

And inside that file's existing `defaultConfig { ... }`:

```groovy
externalNativeBuild {
    cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" }
}
```

Together these shorten the staging path and allow object path hashing. They were needed for the verified local Windows build. Reapply after prebuild. A shorter checkout path can also help; do not disable safe-area support to get the build through. A future build config plugin can automate this workaround.

## 3. Compile

From `android/`:

```powershell
$env:ANDROID_HOME='C:\Users\YOUR-NAME\AppData\Local\Android\Sdk'
$env:JAVA_HOME='C:\Program Files\YOUR-JDK-21'
$env:NODE_ENV='production'
$env:EXPO_PUBLIC_API_URL='https://YOUR-REACHABLE-HOST/api/v1'
.\gradlew.bat :app:assembleRelease --console=plain --max-workers=2 -PreactNativeArchitectures=arm64-v8a
```

On POSIX use the corresponding SDK/JDK environment values and `./gradlew`. The selected ABI is for most modern physical Android phones; an x86 emulator needs a matching ABI/build. This command does not promise universal ABI coverage.

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

### Important: changing API URL with a warm Gradle cache

An environment-only URL change may leave the previous bundled JS task up to date. In that case delete only this generated file and rebuild:

```powershell
Remove-Item -LiteralPath 'app/build/generated/assets/react/release/index.android.bundle'
.\gradlew.bat :app:assembleRelease --console=plain --max-workers=2 -PreactNativeArchitectures=arm64-v8a
```

These commands are from `android/`. Do not delete source or all caches indiscriminately. Check the generated bundle before delivery:

```powershell
rg -a -o 'YOUR-EXPECTED-HOST' app/build/generated/assets/react/release/index.android.bundle
```

The last preview rebuild explicitly checked its current hostname in the bundle after catching this cache behavior.

## 4. Signing and verification

Generated local release configuration currently signs with the generated preview/debug key. It is a preview, not Play Store production signing. Securely preserve the key used for updates; a different certificate cannot update the same installed application. Do not commit private release keys or keystore passwords. Production needs a maintained signing setup and distribution policy.

Use SDK tools (replace SDK path):

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
& "$env:ANDROID_HOME\build-tools\36.0.0\aapt2.exe" dump badging app/build/outputs/apk/release/app-release.apk
Get-FileHash app/build/outputs/apk/release/app-release.apk -Algorithm SHA256
```

Confirm signature, expected application ID/version code, min SDK, ABI and certificate compatibility. Store the release hash in the release notes. Do not claim an APK works merely because Gradle completed.

## 5. Optional EAS cloud build

`eas.json` includes a `preview` profile with `android.buildType: apk` and internal distribution. To use it, configure your Expo account/project and the API environment for that build, then run the EAS CLI's `eas build -p android --profile preview`. AAB output from other profiles is not directly installable like an APK. Follow [Expo's APK instructions](https://docs.expo.dev/build-reference/apk/).

The provided preview was built locally, not uploaded to EAS. This repository does not include an Expo account/project association or private signing setup. Mobile source imports shared backend types outside its directory; keep the repository structure when uploading/building, and validate any EAS monorepo packaging before assuming that route works.

## 6. Distribution

To serve a preview through the API, create the repository-root `artifacts/` directory if absent and copy the built APK to:

```text
artifacts/kahe-attendance-preview.apk
```

The running API serves `/downloads/kahe-attendance-preview.apk`. This route is unauthenticated. Use only when public package distribution is intended. Add a version query such as `?v=3` to avoid a browser reusing an old download. Download the complete file through the actual public hostname and compare its SHA-256 with the local output. Git push does not publish this binary.

Alternatively use an approved internal file service or GitHub Release asset and document its signing identity/hash. No automatic binary release workflow is configured.

## 7. Install and use

Download on Android, allow installation from the chosen browser/file app when requested, and install. Or use `adb install -r path/to/app-release.apk` on an authorized USB-connected device. If Android reports an incompatible update, check signing certificate and version code before uninstalling anything; uninstalling can remove local settings.

At sign-in use **Server connection** to set the current reachable HTTPS API. Native connection settings persist. A newer bundled preview address can migrate an older saved quick-tunnel address; a deliberate non-preview custom address remains selected.

## Physical-device acceptance checklist

1. Verify app version, sign-in, saved server URL and return from app backgrounding.
2. Test normal screenshot/screen recording and recent-app previews. Native secure-window protection should hide content; another camera can still photograph it.
3. Check camera grant/deny/recovery and precise/approximate location permissions.
4. Faculty choose a radius, start attendance at the test location, and verify that reopening/QR refresh does not move its center.
5. Pair the display browser and confirm fresh QR rotation/reconnect/disconnect. End the session and ensure access ends.
6. Student open the matching active session, scan, and confirm a persistent accepted result plus **Marked present** after reopening the card.
7. Switch to **My QR**, verify that the image is visible and fresh, scan it as faculty, and check the student's status updates within the polling interval.
8. Try another session's code, an expired code, a repeated code and a second enrolled student. Wrong/expired/replayed codes must fail; a shared fresh classroom code must work for another student.
9. Test outside the radius, poor GPS accuracy, denied GPS and network timeout. Do not confuse pending or unconfirmed results with present attendance.
10. Test 320/360px-like narrow displays, large system font, short screens, keyboard-open dialogs and long course/professor names.

Automated tests and a browser preview cannot establish these native results. Record device/model/Android version and any remaining issues in release notes.
