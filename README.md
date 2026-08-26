# Server-Driven College Attendance System Backend

A robust, enterprise-grade, backend-authoritative college attendance management system built with **Node.js, TypeScript, PostgreSQL (with embedded PGlite support), and WebSockets**.

The backend serves as the single source of truth, enforcing dynamic policy configuration, advanced spatial and cryptographic anti-fraud protocols, and sub-millisecond attendance analytics via PostgreSQL Materialized Views.

---

## Key Architectural Capabilities

### 1. Server-Driven UI (SDUI) Configuration Contract
- **Dynamic Policy Orchestration**: The backend dynamically delivers JSON configuration payloads defining verification steps (`DECLARATION`, `QR_SCANNER`, `GEOLOCATION_CHECK`, `BIOMETRIC_FACE`, `REVERSE_QR_DISPLAY`).
- **Zero App-Store Update Iteration**: Administrators can instantly add mandatory steps (e.g. academic integrity pledges, high-stakes exam face verification) or adapt outdoor classrooms by expanding geofence boundaries on the fly.
- **Hardware-Aware Adaptation**: Automatically alters flows for sensorless or desktop clients (substituting mobile GPS checks with reverse dynamic QR display or campus subnet validation).

### 2. Five-Layer Fraud Mitigation & Anti-Spoofing Protocol
- **Layer 1: Time-Bound Cryptographic Rotating QR Codes**
  - Signed via HMAC-SHA256 with rotating server secrets.
  - Automatically regenerates every 15–20 seconds via WebSockets.
  - Exportable as PNG/SVG/DataURL with custom expiration (e.g., 5 min, 15 min).
  - Cryptographic nonce replay prevention with atomic database tracking.
  - **Bidirectional Scanning**: Supports both Professor broadcast QR (1-to-many) and Student personal dynamic QR scanned by Professor (1-to-1 reverse scan).
- **Layer 2: Spatial Geofencing & Haversine Proximity Math**
  - High-precision great-circle distance calculations via the Haversine formula.
  - Strict GPS accuracy radius filtering ($\le 35\text{m}$) to reject drifted/inaccurate coordinates.
  - Borderline buffer logic: Attempts slightly beyond boundary escalate to `CHALLENGE` state instead of hard failure.
- **Layer 3: Client Mock Location & GPS Spoofing Detection**
  - Inspects client telemetry (`isFromMockProvider`, `isMock`, fake GPS apps, developer options).
  - Anomaly velocity detection (flags physical teleportation/impossible speeds across consecutive scans).
  - Automatically logs security violations to an immutable disciplinary audit ledger.
- **Layer 4: Policy-Driven Multi-Condition Evaluation & Audit Trails**
  - Evaluates attempts into three discrete states: `ACCEPT`, `CHALLENGE`, or `REJECT`.
  - Granular diagnostic JSON stored with every attempt for transparent dispute resolution.
  - Real-time 1-click challenge resolution queue for professors.
- **Layer 5: Multi-Factor Biometric Verification**
  - Cosine similarity matching between live face embedding vectors and enrolled student profile vectors.
  - Configurable confidence threshold (default 75%).

### 3. High-Performance PostgreSQL Analytics via Materialized Views
- **Sub-Millisecond Queries**: Avoids expensive multi-table joins across millions of rows by pre-aggregating attendance statistics into `mv_student_course_attendance` and `mv_session_attendance_stats`.
- **Zero-Downtime Concurrent Refresh**: Supports `REFRESH MATERIALIZED VIEW CONCURRENTLY` without locking read queries.

### 4. Dual-Mode Database Architecture
- **Embedded Mode (Default)**: Runs real PostgreSQL 16 compiled to WebAssembly via `@electric-sql/pglite` with persistence in `./data/attendance.db` (zero external dependencies required).
- **External Mode**: Automatically connects to any external PostgreSQL cluster (AWS RDS, Neon, Supabase) when `DATABASE_URL` is set.

---

## Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node.js v26)
- npm v9+

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Leave `DATABASE_URL=` empty to run embedded PostgreSQL out of the box!)*

### 3. Database Migration & Seeding
```bash
# Run schema migrations and seed realistic university dataset
npm run seed
```

### 4. Run Automated Test Suite
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```
- REST API: `http://localhost:4000/api/v1`
- WebSocket Server: `ws://localhost:4000/ws`
- Health Check: `http://localhost:4000/health`

---

## Pre-Configured Seed Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@university.edu` | `password123` | Full administrative privileges |
| **Professor** | `prof.alan@university.edu` | `password123` | Assigned to CS101 in Turing Hall |
| **Professor** | `prof.ada@university.edu` | `password123` | Assigned to CS201 in Lovelace Lab |
| **Student** | `student.john@university.edu` | `password123` | Enrolled in CS101, CS201 (STU2026001) |
| **Student** | `student.sarah@university.edu` | `password123` | Enrolled in CS101, CS201 (STU2026002) |
| **Student** | `student.david@university.edu` | `password123` | Enrolled in CS101, CS201 (STU2026003) |
| **Student** | `student.emily@university.edu` | `password123` | Enrolled in CS101, CS301 (STU2026004) |

---

## API Reference Overview

### Authentication (`/api/v1/auth`)
- `POST /login`: Authenticate and receive Bearer JWT.
- `POST /register`: Register a new student, professor, or admin.
- `GET /me`: Fetch authenticated user profile.
- `PUT /face-embedding`: Register or update 128-dimensional biometric face vector.

### Server-Driven Flows (`/api/v1/flows`)
- `GET /student?sessionId=...&hasGps=true&platform=android`: Returns dynamic step-by-step UI schema tailored to session policy and client device capabilities.
- `GET /professor?sessionId=...`: Returns projector settings and rotation intervals.
- `PUT /sessions/:sessionId/policy`: Dynamically overrides session verification rules (e.g. toggle biometrics or outdoor geofence).

### Sessions & Cryptographic QR Codes (`/api/v1/sessions`)
- `GET /`: List sessions (filter by `status` or `courseId`).
- `GET /:id`: Fetch session details and classroom geofence coordinates.
- `POST /`: Schedule a new session.
- `POST /:id/start`: Activate session.
- `POST /:id/end`: Complete session and trigger materialized view refresh.
- `GET /:id/qr-code`: Fetch current active signed rotating QR code.
- `GET /:id/qr-export?format=png|svg|dataUrl&expiresInSeconds=300`: Export signed QR image with custom expiration.

### Attendance Engine (`/api/v1/attendance`)
- `POST /attempt`: Student submits attempt payload with scanned QR, coordinates, and telemetry.
- `GET /student-qr?sessionId=...`: Student generates personal time-bound dynamic QR for reverse scan.
- `POST /professor-scan`: Professor device directly scans student dynamic QR for instant 1-to-1 attendance.
- `GET /challenges?sessionId=...`: Review queue of flagged attendance attempts.
- `POST /resolve-challenge`: Professor 1-click approve (`ACCEPT`) or deny (`REJECT`) flagged attempts.
- `GET /attempts`: Full audit log of all attempts with complete diagnostics.
- `GET /records`: Official finalized attendance ledger.

### High-Performance Analytics (`/api/v1/analytics`)
- `GET /student/:studentId`: Query student attendance percentage per course from materialized views.
- `GET /session/:sessionId`: Query session attendance statistics.
- `POST /refresh`: Trigger concurrent refresh of materialized views.
- `GET /security-violations`: Disciplinary audit log of detected mock locations and spoofing events.

---

## Real-Time WebSocket Protocol (`ws://localhost:4000/ws`)

### 1. Classroom Display Subscription
Connect to `ws://localhost:4000/ws` and transmit subscription frame:
```json
{
  "type": "SUBSCRIBE",
  "sessionId": "sess_cs101_active",
  "role": "DISPLAY"
}
```

### 2. Rotating QR Broadcast (Server ➔ Display)
Pushed automatically every 15 seconds:
```json
{
  "type": "QR_ROTATION",
  "sessionId": "sess_cs101_active",
  "qrPayload": "eyJ0eXBlIjoiU0VTU0lPTl9CUk9BRENBU1QiLC...",
  "qrDataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "timestamp": 1787804500,
  "expiresAt": 1787804520,
  "expiresInSeconds": 20
}
```

### 3. Live Check-In Push Event (Server ➔ Professor)
Emitted instantly whenever a student check-in is evaluated:
```json
{
  "type": "STUDENT_CHECK_IN",
  "sessionId": "sess_cs101_active",
  "data": {
    "attemptId": "att_1787804533548_2qc1jfh",
    "studentId": "usr_student_sarah",
    "studentName": "Sarah Connor",
    "enrollmentId": "STU2026002",
    "decision": "ACCEPT",
    "status": "PRESENT",
    "distanceMeters": 7.1,
    "timestamp": "2026-08-27T04:22:13.548Z"
  }
}
```
