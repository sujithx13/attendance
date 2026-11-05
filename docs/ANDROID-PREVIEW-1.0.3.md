# Android preview 1.0.3 — 29 October 2026

Built from commit `4c35efc` in [GitHub Actions run 40866572035](https://github.com/PradFr/attendance/actions/runs/40866572035).

- Application ID: `edu.kahe.attendance`
- Version: 1.0.3; Android version code: 4
- Architecture: ARM64 (`arm64-v8a`)
- Preview/debug signing; APK Signature Scheme v2 verification passed.
- SHA-256: `7f7cd324061b325665145df89babd755eb18580229410b6696102dc6df6fc1a3`
- Bundled API: `https://tracks-shell-musicians-subsidiary.trycloudflare.com/api/v1`
- Temporary admin site: https://tracks-shell-musicians-subsidiary.trycloudflare.com/
- Temporary APK download: https://tracks-shell-musicians-subsidiary.trycloudflare.com/downloads/kahe-attendance-preview.apk

Verified locally: signature, application/version/architecture metadata, API hostname in the bundled Hermes code, and an identical local delivery copy. This is an installable standalone preview; Expo Go and Metro are not needed. Physical device installation/camera acceptance has not been performed here.

The Quick Tunnel forwards the local built admin site and API gateway. It is temporary and needs the API, gateway, tunnel, computer and network to stay online. A restarted tunnel can have a new hostname; it does not establish permanent Cloudflare hosting. The APK supports configuring a different reachable server address.

The workflow `.github/workflows/android-preview.yml` builds future previews using the supplied public API URL. Native projects, private keys, databases, runtime gateway/tunnel configuration, dependencies and APK outputs remain excluded from Git.
