# KAHE Attendance Mobile

This Expo/React Native mobile frontend implements the streamlined KAHE attendance experience. The student journey is **scanner-first**: the app collects the classroom QR and permitted device context within a single scan action, then submits one attendance attempt to the supplied service. There are no pledge, separate location, selfie, or learning-plan screens.

## Run locally

Install dependencies with `npm install`, then use `npm run android`, `npm run ios`, or `npm run web`. The project uses Expo SDK 57 and includes the supplied KAHE logo in `assets/kahelogo.jpeg`.

## Connected API calls

| Mobile capability | Endpoint | Status |
|---|---|---|
| Sign-in | `POST /auth/login` | Connected; token is held in React state only. |
| Scanner configuration | `GET /flows/student?sessionId=...` | Connected before student scan use. |
| Attendance submission | `POST /attendance/attempt` | Connected after a QR is scanned and permitted location context is available. |
| Personal student QR | `GET /attendance/student-qr?sessionId=...` | Connected; API data URL is rendered directly. |
| Attendance summaries | `GET /analytics/my-summary` | Connected. |

The supplied backend contract **does not include** a faculty live-QR generation/export endpoint or a professor roster submission endpoint. The faculty interface therefore supports class label, session ID, expiry input, and an API-ready PNG export path, but correctly reports that it is waiting for a returned faculty QR image rather than fabricating one.

## Validation

TypeScript validation, four unit tests, and a production Expo web export completed successfully. Live testing also confirmed login for both supplied test roles, the student personal QR response, and student attendance analytics. A real attendance attempt was not submitted during validation because doing so would create a live attendance record.
