# Server-Driven College Attendance & Academic Management System

An enterprise-grade, server-authoritative institutional attendance, timetable scheduling, and cohort management platform built with **Node.js, TypeScript, PostgreSQL (with embedded PGlite support), WebSockets, React (Vite Admin Dashboard), and React Native (Expo Mobile App)**.

---

## 🏛️ Platform Architecture

```text
├── src/                               # Backend REST API & Real-time WebSockets
│   ├── config/                        # Environment & server settings
│   ├── controllers/                   # Auth, Sessions, Attendance, Batches, Timetables, etc.
│   ├── database/                      # PGlite embedded PostgreSQL database engine & migrations
│   ├── routes/                        # Express API route declarations
│   ├── services/                      # Cryptographic QR service, Policy engine, Analytics, etc.
│   └── types/                         # TypeScript interfaces and SDUI contracts
│
├── admin-dashboard/                   # Web-based University Administration Portal
│   ├── src/components/                # Layouts, Custom ConfirmDialogs, Modals, Forms
│   ├── src/views/                     # Live Monitor, Departments, Batches, Timetables, Directory
│   └── src/services/                  # Typed administrative API client
│
├── KAHE-mobile-attendance-frontend-api/ # Cross-Platform Mobile Application (Expo / React Native)
│   ├── App.tsx                        # Emerald-themed native interface & Universal QR Scanner
│   ├── lib/api.ts                     # Mobile API client with session management
│   └── lib/navigation.ts              # Role-aware mobile navigation bar
│
└── sql/                               # Incremental PostgreSQL database migrations (001 - 008)
```

---

## ✨ Key Capabilities & Architectural Highlights

### 1. 📷 Universal Bidirectional QR Attendance & Out-of-Batch Verification
- **Student Class QR Pass**: Students tap any lecture in their timetable to generate a signed dynamic QR pass specifically bound to that session. When any professor scans it, attendance is recorded as **`PRESENT`**.
- **Faculty Classroom Live Broadcast**: Professors tap any class in their schedule to launch a live rotating cryptographic QR code (HMAC-SHA256, rotating every 15s) for students to scan in the lecture hall.
- **Universal Smart Scanner**: A single scanner interface in the mobile app that automatically detects whether it's scanning a student pass (for professors) or a classroom broadcast (for students).
- **Out-of-Batch Professor Override**: Migration `008_allow_out_of_batch_professors.sql` enables any institutional professor to scan students for edge cases/substitute lectures, recording attendance as **`PRESENT`** with audit tracking (`marked_by: 'PROFESSOR_OUT_OF_BATCH'`).

### 2. 🛡️ Five-Layer Fraud Mitigation & Anti-Spoofing Engine
1. **Time-Bound HMAC-SHA256 Cryptographic Tokens**: Server-signed rotating nonces with atomic replay prevention.
2. **Spatial Geofencing**: High-precision Haversine distance math with GPS accuracy radius filtering ($\le 35\text{m}$) and border buffer logic.
3. **Client Mock Location & GPS Spoofing Detection**: Telemetry inspection (`isFromMockProvider`, developer options, fake GPS apps, velocity teleportation detection).
4. **Policy-Driven Multi-Condition Decision Engine**: Discrete `ACCEPT`, `CHALLENGE`, or `REJECT` state evaluation with structured diagnostics stored per attempt.
5. **Biometric Face Verification (Optional)**: 128-dimensional vector cosine similarity matching against enrolled student face vectors.

### 3. 🗓️ Academic Cohort Batches & Interactive Timetable Matrix
- **Flexible Batch Cohorts**: Support multi-department, multi-year cohorts with multiple assigned faculty mentors.
- **AM/PM 12h Timetable Scheduling**: Weekly matrix (Monday through Saturday) with human-friendly time selectors (`09:00 AM – 10:30 AM`), instant 1-click slot editing, deletion, and session launching.
- **Sunday Holiday Support**: Context-aware scheduling that identifies weekend holidays on mobile and defaults to the upcoming week.

### 4. 🎨 Modern Design & Reusable Confirmation Dialogs
- **Institutional Emerald Theme**: Karpagam Green (`#0D631B` / `#16A34A`), elevated white cards, segmented day pickers, and floating navigation dock.
- **Custom Confirmation Modals**: Built-in high-contrast modal dialogs (`ConfirmDialog` in admin dashboard and `ConfirmModal` / `ResultModal` in mobile app) eliminating raw browser `alert()` and `confirm()` prompts.
- **Profile Screen View & Edit Modes**: Read-only institutional credentials view by default + on-demand edit mode protected by confirmation popups.

### 5. ⚡ PostgreSQL Materialized Views & Dual-Mode Database
- **Sub-Millisecond Queries**: Fast queries via PostgreSQL Materialized Views (`mv_student_course_attendance`, `mv_session_attendance_stats`).
- **Embedded Zero-Config Database**: Runs PostgreSQL 16 WebAssembly via `@electric-sql/pglite` stored locally in `./data/attendance.db`. Or connect to external PostgreSQL clusters by setting `DATABASE_URL`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v20 / v22 / v26)
- **npm**: v9+

---

### 1. Backend Server Setup

```bash
# Navigate to the workspace root and install dependencies
npm install

# Start the Backend Server (Runs on port 4000)
npm run dev
# Or build and run production bundle:
npm run build && node dist/server.js
```
- **REST API**: `http://localhost:4000/api/v1`
- **WebSocket Server**: `ws://localhost:4000/ws`
- **Health Check**: `http://localhost:4000/health`

---

### 2. Admin Dashboard Setup

```bash
# Open a new terminal in admin-dashboard
cd admin-dashboard
npm install

# Start the Vite development server (Runs on port 5173)
npm run dev
```
- **Admin Portal**: `http://localhost:5173`

---

### 3. Mobile App (Expo / React Native) Setup

```bash
# Open a new terminal in KAHE-mobile-attendance-frontend-api
cd KAHE-mobile-attendance-frontend-api
npm install

# Start Expo dev server with LAN and Web support (Runs on port 8081)
npx expo start --host lan --web
```
- **Mobile Web App**: `http://localhost:8081` (or `http://<YOUR_LOCAL_IP>:8081`)
- **Native Mobile**: Scan the displayed terminal QR code using the **Expo Go** app on iOS or Android.

---

## 🔑 Default Credentials

| Role | Email | Password | Access Details |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@university.edu` | `password123` | Full access to Admin Dashboard |
| **Faculty / Professor** | `prof.alan@university.edu` | `password123` | Broadcast Live Class QRs, scan student passes |
| **Student** | `student.john@university.edu` | `password123` | View timetable, generate class passes, scan live QRs |

---

## 📡 Core API Reference

### Authentication (`/api/v1/auth`)
- `POST /login`: Authenticate and obtain Bearer JWT.
- `POST /register`: Register user account.
- `GET /me`: Get authenticated profile.
- `PUT /profile`: Update full name, academic department, and year of study.

### Attendance & Verification (`/api/v1/attendance`)
- `POST /attempt`: Student submits attendance attempt with scanned QR and telemetry.
- `GET /student-qr?sessionId=...`: Generate time-bound signed dynamic QR pass for a specific class.
- `POST /professor-scan`: Professor scans a student pass (with in-batch and out-of-batch verification).
- `GET /challenges`: Professor review queue for challenged scans.
- `POST /resolve-challenge`: 1-click accept or reject challenged attempts.

### Cohort Batches & Scheduling (`/api/v1/batches` & `/api/v1/timetable`)
- `GET /batches`: List batches with department and member count metadata.
- `POST /batches`: Create new academic cohort with faculty mentor assignments.
- `GET /batches/my`: Fetch enrolled/mentored batches for the current user.
- `GET /timetable/my`: Fetch weekly schedule slots for the authenticated student or faculty.
- `POST /timetable/slots`: Create or update weekly recurring lecture slots.
- `DELETE /timetable/slots/:id`: Remove schedule slot.

### Sessions & Cryptographic QR Codes (`/api/v1/sessions`)
- `POST /launch-slot`: Activate a scheduled timetable slot into a live attendance session.
- `GET /:id/qr-export?format=dataUrl&expiresInSeconds=900`: Export rotating live broadcast QR image.
- `POST /:id/end`: Terminate session and refresh materialized views.

---

## 🗄️ Database Migrations

| Migration File | Description |
| :--- | :--- |
| `001_initial_schema.sql` | Users, Courses, Classrooms, Sessions, Enrollments, Audit logs |
| `002_attendance_and_audit.sql` | Attendance attempts, diagnostic telemetry, QR nonces, policy overrides |
| `003_materialized_views.sql` | Fast materialized views for course and session analytics |
| `004_departments_batches_timetables.sql` | Academic departments, batches, batch members, timetable slots |
| `005_templates_announcements_crud.sql` | Department templates, institutional announcements |
| `006_fix_courses_and_add_details.sql` | Enhanced course metadata |
| `007_batch_professors.sql` | Multi-faculty mentor assignment per batch cohort |
| `008_allow_out_of_batch_professors.sql` | Adds `PROFESSOR_OUT_OF_BATCH` attendance recording support |
