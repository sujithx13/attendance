# Internet access and deployment

## What is hosted where

The API is a long-running Node.js process. It owns REST, `/ws`, the display page and database connections. Cloudflare Tunnel can forward a public HTTPS hostname to it. The project does not currently contain a Cloudflare Worker/D1 deployment, a Docker image, infrastructure-as-code or a hosted production environment.

A standalone APK can use cellular data from anywhere if its configured API is reachable. `localhost` on the phone will never reach a separate PC. The computer hosting the API must stay awake and connected when a tunnel is used.

## Option A: temporary phone test through Cloudflare

Install `cloudflared` from the [official downloads](https://developers.cloudflare.com/tunnel/downloads/). First start the backend from the repository root:

```powershell
npm.cmd run build
npm.cmd start
```

In another terminal:

```powershell
cloudflared tunnel --url http://127.0.0.1:4000 --no-autoupdate --protocol http2
```

Use the generated `https://...trycloudflare.com` origin:

| Destination | Address |
| --- | --- |
| Health check | `https://YOUR-TUNNEL.trycloudflare.com/health` |
| Phone API | `https://YOUR-TUNNEL.trycloudflare.com/api/v1` |
| Classroom browser | `https://YOUR-TUNNEL.trycloudflare.com/display/` |
| Optional APK download | `https://YOUR-TUNNEL.trycloudflare.com/downloads/kahe-attendance-preview.apk` |

Enter the API address in **Server connection** at phone sign-in or build with `EXPO_PUBLIC_API_URL` set to it. The APK endpoint works only if `artifacts/kahe-attendance-preview.apk` exists on that API host. This is a public route: anyone with its link can download that file. Publishing a Git commit does not upload an APK to that endpoint or to GitHub Releases.

Quick Tunnels use changing hostnames and are intended for testing. The URL stops working with the process; there is no uptime guarantee. See [Cloudflare's Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Authentication modes requiring an interactive browser are unsuitable for the app's current bearer-API requests.

The tunnel exposes the API/display, not the separately running Vite admin app. Do not expect the admin dashboard at the API origin unless you configure a web server to serve it there. Avoid exposing a disposable seeded database for ongoing use.

## Option B: stable Cloudflare hostname to an always-on server

Create a managed/named Cloudflare Tunnel and associate an owned hostname with an HTTP service pointing to `http://127.0.0.1:4000`. Follow the [official tunnel setup](https://developers.cloudflare.com/tunnel/). Run the connector and backend under the host's service manager with restart policies. Keep connector credentials outside the repository.

This gives a stable internet address but the API/database still reside on that server. Provide durable storage and backups. If an access gateway is placed in front of the API, adapt mobile authentication explicitly; browser login cookies are not automatically available to the native API client.

## Option C: conventional Node + PostgreSQL deployment

Use a host that supports a persistent Node process, HTTPS, WebSocket upgrades and access to PostgreSQL. An ephemeral static/function-only host is not enough for the current process/database/socket design.

### Files and build

Deploy the repository and install/build the backend:

```sh
export npm_config_script_shell=/bin/sh
npm ci
npm run build
```

Build the admin assets separately:

```sh
cd admin-dashboard
npm ci
npm run build
cd ..
```

The API runtime needs `dist/`, `sql/`, `public/`, `package.json` and production dependencies, and must start from the repository root. Keep the complete checkout for simplicity. The TypeScript build alone does not copy migrations or static display assets. Do not serve source, `.env` or `data/` through the web server.

### Production environment

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
DATABASE_URL=postgresql://APP_USER:URL_ENCODED_PASSWORD@DB_HOST:5432/attendance
JWT_SECRET=REPLACE_WITH_INDEPENDENT_RANDOM_SECRET_AT_LEAST_32_CHARS
QR_HMAC_SECRET=REPLACE_WITH_ANOTHER_INDEPENDENT_RANDOM_SECRET_AT_LEAST_32_CHARS
```

Generate the actual secrets privately. Use your database provider's documented TLS connection settings; do not disable certificate verification to make connectivity work. URL-encode special characters in credentials. In a container/platform that routes to all interfaces, use `HOST=0.0.0.0` and its assigned port rather than the loopback example.

Production secret validation rejects missing/short values, but does not establish that every human-provided string is random. Protect and rotate secrets through your platform. Rotating JWT secret invalidates existing sessions; QR key changes invalidate outstanding QR codes. Derived display credentials are affected by their signing root.

### Start and process management

Run `node dist/server.js` with the repository root as working directory. Example systemd unit to adapt to your host:

```ini
[Unit]
Description=Attendance API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=attendance
WorkingDirectory=/srv/attendance
EnvironmentFile=/etc/attendance/api.env
ExecStart=/usr/bin/node /srv/attendance/dist/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

Create the service user/directories, set ownership and configure the environment file through your normal host administration process. No service is installed automatically by this repository. Each API startup runs pending migrations; coordinate schema deployment so multiple replicas do not race migrations. A separate controlled migration stage is preferable before scaling replicas.

### Serve dashboard, API and display at one HTTPS origin

The admin API client uses relative `/api/v1` and `/ws`; a static-only deployment without these proxies fails. Example Nginx routing inside an existing HTTPS server block:

```nginx
# Put this map in the nginx http context, outside server {}.
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    # Configure listen 443 ssl, server_name and valid certificates for your host.
    root /srv/attendance/admin-dashboard/dist;
    index index.html;
    client_max_body_size 10m;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }
    location /ws {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
    location /display/ {
        proxy_pass http://127.0.0.1:4000;
    }
    location = /health {
        proxy_pass http://127.0.0.1:4000;
    }
    location /downloads/ {
        proxy_pass http://127.0.0.1:4000;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

This is a routing example, not a complete TLS configuration. Add certificates, hostnames, access logs and platform hardening. With this layout, admin opens at the origin, display at `/display/`, and the phone API is `https://attendance.example.edu/api/v1`. A separate API subdomain is also possible, but the current admin still needs same-origin routing or an intentional API client change.

### First administrator and real data

There is no unattended secure admin-bootstrap CLI. `/auth/register` requires an administrator. For an isolated test environment, seed demo data before starting the service. For a real institution, provision the first administrator through a controlled migration/provisioning procedure with a securely generated bcrypt password hash, then use authenticated admin account management. Do not insert plaintext passwords or use published demo credentials. Design a maintained bootstrap/reset workflow before production onboarding.

Never reseed a running institutional database to recover an account. Seeding is not a data migration or backup strategy.

## Storage, backup and upgrades

- **PGlite**: keep a persistent volume at `data/attendance.db/`; use one API owner. Stop the API and copy the whole directory for a consistent offline backup. An ephemeral filesystem loses data on restart/redeploy.
- **PostgreSQL**: use provider backups and tested `pg_dump`/restore procedures. Database regression tests in this repository run against PGlite; validate PostgreSQL separately.
- **Upgrades**: back up, review new SQL files, stop/coordinate writers, deploy code and apply migrations, verify auth and attendance, then release the matching app if API contracts changed.
- **Rollback**: code rollback does not reverse schema/data migrations. Restore a tested backup or write a deliberate corrective migration. Never erase the migration ledger to force a replay.
- **Observability**: collect process errors and health checks, monitor database capacity, socket reconnects, pending challenge volumes and backup success. Redact tokens, precise location and student identity from public logs.

## Before using real student data

Current code is a testing baseline. Complete and review these work items for your environment:

1. Restrict the current reflective CORS policy; add general login/API abuse controls.
2. Establish real accounts, recovery, password management and administrator bootstrap; remove demo access.
3. Configure HTTPS, WebSockets, stable secrets and release signing.
4. Define student-data retention, access auditing, location/privacy handling and backup ownership.
5. Verify that broad out-of-batch professor marking is acceptable for institutional policy.
6. Load-test attendance bursts, challenge review, database contention and WebSocket reconnection.
7. For multiple API instances, add shared rate limiting and socket fan-out. Current in-memory maps do not span replicas.
8. Run physical Android acceptance checks and external PostgreSQL tests before declaring production readiness.
