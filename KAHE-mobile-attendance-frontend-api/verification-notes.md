> Historical notes from an earlier mobile prototype. Some described screens and simulated verification flows have been replaced. For the current implementation, validation evidence and remaining work, read [Work completed](../docs/WORK-COMPLETED.md), [Architecture](../docs/ARCHITECTURE.md) and [Android testing](../docs/ANDROID.md). These historical entries do not establish physical-device verification of the current build.

# Mobile Preview Verification Notes

The Expo web preview loaded successfully after the bundle completed. The KAHE logo, logo-derived palette, touch navigation, student dashboard, and attendance flow all rendered without console errors.

The student attendance interaction was checked from the dashboard through the integrity pledge and into the QR scanning step. The pledge state visibly enables progression and the next verification screen loads correctly.

The demo scan correctly produces a verified state and allows the flow to advance. The location-verification screen then renders with the expected progress state, classroom guardrail summary, and a working action to continue the verification sequence.

The browser console remained free of runtime errors. The mobile home dock returns from the attendance flow correctly, and the Student/Faulty role selector transitions to the faculty dashboard with the expected classroom, roster-scan, session-rule, and challenge-review entry points.

The faculty live classroom screen renders its high-contrast rotating-code surface and control actions. The pause action correctly changes the interface from a live to a paused state and exposes the resume action.

The revised Expo web preview loaded the scanner-first login screen. The supplied student test account authenticated successfully against the live service, and the returned user identity rendered in the signed-in student workspace.

The authenticated personal-QR request completed successfully. The mobile view displayed the backend-returned PNG data URL as a live scannable QR code rather than using a generated placeholder.

The authenticated analytics request completed successfully. The mobile app rendered the backend course summaries for CS101 and CS201 with their returned attendance percentages.

The supplied professor test account also authenticated successfully. The returned faculty role opened the dedicated faculty home screen with live-QR setup and roster-scanner navigation, while the browser console remained free of runtime errors.
