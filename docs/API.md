# API and real-time integration guide

**Updated workflow:** [Current mobile attendance rules](CURRENT-MOBILE-WORKFLOW.md) supersede the manual-start/GPS descriptions below. Scheduled sessions open automatically; teachers confirm out-of-time actions; students can show same-day passes; GPS checks are paused.

Base prefix: `/api/v1`. Most routes require `Authorization: Bearer <JWT>`. Bodies are JSON. Treat this guide as an orientation; route/controller/types files are the exact contract. Errors generally carry `error` and/or `message`; clients must not treat a successful QR decode or HTTP request alone as an accepted attendance decision.

## Entry points

| Method/path | Purpose |
| --- | --- |
| `GET /health` | Process health response, outside `/api/v1` |
| `GET /display/` | Public browser pairing page |
| `GET /downloads/kahe-attendance-preview.apk` | Optional public local artifact download |
| `POST /api/v1/auth/login` | `{email,password}` -> `{token,user}` |
| `POST /api/v1/auth/register` | Admin-authenticated account creation |
| `GET /api/v1/auth/me` | Current account |
| `PUT /api/v1/auth/profile` | Profile update |
| `PUT /api/v1/auth/face-embedding` | Admin-only embedding enrollment; comparison support is not liveness |

## Academic management

The `departments`, `courses`, `classrooms`, `batches`, `users`, `timetable`, `timetable/templates` and `announcements` route groups provide administrative CRUD and role-scoped reads. Use the admin service/types as examples of request shapes. Do not infer permission from a path name; role middleware and shared scope checks are part of the contract.

`GET /timetable/my` returns slots for the signed-in student or professor, including course/room/professor labels and current session context. Student context includes `attendanceStatus`, `sessionId`, `sessionActive`, verification time and origin readiness/radius. Status is derived from saved records, not optimistic UI state.

## Sessions

| Method/path under `/api/v1` | Behavior |
| --- | --- |
| `GET /sessions` | Scoped session list; optional status/course filters |
| `GET /sessions/:id` | Authorized real session detail |
| `GET /sessions/for-slot/:slotId` | Authorized slot -> current session and own attendance context |
| `POST /sessions` | Staff/admin scheduled session creation |
| `POST /sessions/launch-slot` | Assigned professor/admin launches or reuses an active slot session |
| `POST /sessions/:id/start` | Authorized session activation |
| `POST /sessions/:id/end` | Authorized completion |
| `GET /sessions/:id/qr-code` | Staff classroom token/image |
| `GET /sessions/:id/qr-export?format=dataUrl&expiresInSeconds=60` | Staff image/export with bounded validity |

Launch body example (coordinates below are illustrative, not a production location):

```json
{
  "slotId": "slot_example",
  "location": {
    "latitude": 11.0,
    "longitude": 76.0,
    "accuracy": 8,
    "timestamp": 1790000000000,
    "radiusMeters": 100,
    "mocked": false
  }
}
```

Supply an actual fresh timestamp in milliseconds and the phone's measured coordinates/accuracy. A literal timestamp copied from documentation will fail freshness validation. `batchId` may also be included but must agree with the slot. `location` remains optional for legacy API clients; the current mobile start flow supplies it. The first saved origin cannot be replaced by subsequent launches.

Context example:

```json
{
  "sessionId": "sess_example",
  "sessionActive": true,
  "attendanceStatus": "NOT_MARKED",
  "verifiedAt": null,
  "locationReady": true,
  "radiusMeters": 100
}
```

No active session means a waiting state; the student must not launch one on behalf of faculty. A slot ID is never interchangeable with a session ID except where an endpoint explicitly resolves it.

## Student attempts and personal passes

`GET /flows/student?sessionId=REAL_SESSION_ID` returns the server policy and ordered verification steps. The server checks access; the client uses the policy to gather supported evidence.

`POST /attendance/attempt` accepts the shared `AttendanceAttemptPayload` (`src/types/attempt.types.ts`): session ID, QR payload, timestamp, required presence declaration and optional device/location/telemetry evidence.

```json
{
  "sessionId": "sess_example",
  "qrPayload": "BASE64URL_SERVER_ISSUED_TOKEN",
  "clientTimestamp": "2026-10-29T08:00:00.000Z",
  "declarationAccepted": true,
  "coordinates": { "latitude": 11.0, "longitude": 76.0, "accuracy": 8 },
  "telemetry": { "isFromMockProvider": false }
}
```

Use actual measured values, not the illustrative body above. The response includes decision, reason, diagnostic checks and persistence identifiers:

| HTTP | Decision | UI meaning |
| --- | --- | --- |
| 200 | `ACCEPT` | Attendance accepted/persisted |
| 202 | `CHALLENGE` | Pending professor review |
| 403 | `REJECT` | Rejected attempt, not saved present attendance |

Other 400/401/403/409/500 errors may be validation/auth/session/service failures and need separate handling. Only recognize a rejected attendance response as a decision when its payload explicitly contains `decision: REJECT`; do not reinterpret any authorization failure as an ordinary attendance result.

`GET /attendance/student-qr?sessionId=...` requires student role/enrollment and an active unexpired session. It can resolve a timetable slot, but clients should use context's actual session ID. Response includes `sessionId`, `studentId`, `qrPayload`, PNG `dataUrl`, Unix-second `expiresAt`, issue time and `expiresInSeconds`. No started session returns a conflict with a clear waiting explanation.

`POST /attendance/professor-scan` accepts `{sessionId,studentQrPayload}` and verifies the pass. It requires an institutional professor/admin and records the supported marking/audit source. A student's own generated pass is not a successful attendance record until scanned/accepted.

## Review and analytics

Attendance routes expose pending challenges, resolution, records and attempt audit views according to role. Challenge resolution accepts `ACCEPT`/`REJECT`, checks scope and current pending ownership, and updates the official record. Inspect `src/routes/attendance.routes.ts` for exact routes and `analytics.routes.ts` for summary/session/campus analytics endpoints.

Summary materialized views may lag current records. For immediate per-session student UI, use the session-context endpoint rather than an aggregate percentage.

## Display pairing

| Method/path under `/api/v1/display` | Credential |
| --- | --- |
| `POST /pairing` | Public; returns code/device secret |
| `GET /state` | Bearer device secret; waiting or paired state |
| `DELETE /state` | Bearer device secret; self-disconnect |
| `POST /sessions/:id/pair` | Faculty/admin JWT and `{code}`; claims display |
| `DELETE /sessions/:id/pair` | Faculty/admin JWT; disconnects session displays |

Code and secret have different purposes. Keep the device secret private. A paired state supplies a limited display token, not a normal account JWT. Codes expire and cannot be reused. Token/connection refresh must respect revocation and session closure.

## WebSockets

Connect to `ws://HOST:4000/ws` locally or `wss://HTTPS_HOST/ws` online. Reverse proxies must forward upgrade headers.

Admin/staff subscription:

```json
{"type":"SUBSCRIBE","sessionId":"CAMPUS","token":"ACCOUNT_JWT"}
```

`CAMPUS` is admin-only. A professor may subscribe to an authorized actual session ID. Ordinary student accounts cannot subscribe to classroom/campus broadcasts.

Display subscription:

```json
{"type":"SUBSCRIBE_DISPLAY","token":"LIMITED_DISPLAY_TOKEN"}
```

Clients handle `QR_ROTATION`, staff `STUDENT_CHECK_IN` and subscription/error responses as implemented in `src/websocket/session-socket.ts`. Display subscribers never receive student check-in records. Reconnect with fresh authorized credentials after expiry. QR messages carry session-bound payload/image/expiry information; clear an expired code instead of leaving it visible.
