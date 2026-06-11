# Multi-Service Docker Application

A production-grade, multi-container application demonstrating advanced Docker concepts including custom base images, multi-stage builds, network isolation, Docker Secrets, health checks, and Redis caching — all orchestrated with Docker Compose.


---

##  Architecture

```
                        ┌──────────────────────────────────────┐
                        │         Host Machine :8080           │
                        └─────────────────┬────────────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │   Nginx Reverse Proxy │
                              │     (app_proxy)       │
                              └──────┬─────────┬──────┘
                                     │         │
                    ┌────────────────▼─┐   ┌───▼─────────────────┐
                    │  frontend-tier   │   │    backend-tier     │
                    │                  │   │                     │
                    │  ┌────────────┐  │   │  ┌──────────────┐   │
                    │  │  React +   │  │   │  │ Express API  │   │
                    │  │  Nginx SPA │  │   │  │  (Node 20)   │   │
                    │ │(app_frontend)│ │   │  │(app_backend) │   │
                    │  └────────────┘  │   │  └──────┬───────┘   │
                    │                  │   │         │           │
                    └──────────────────┘   │  ┌──────▼───────┐   │
                                           │  │   MongoDB 6  │   │
                                           │  │(app_database)│   │
                                           │  └──────────────┘   │
                                           │  ┌──────────────┐   │
                                           │  │  Redis 7     │   │
                                           │  │  (app_cache) │   │
                                           │  └──────────────┘   │
                                           └─────────────────────┘
```

---

## Features

| Feature | Implementation |
|---|---|
| **Custom Base Image** | `my-node-base:20-alpine` — Node 20 + security-patched Alpine packages |
| **Multi-Stage Builds** | React → Vite → production static assets served by lightweight Nginx |
| **Network Isolation** | `frontend-tier` & `backend-tier` — DB/Cache unreachable from frontend |
| **Docker Secrets** | DB passwords mounted as files at `/run/secrets/` — never in env vars |
| **Least-Privilege DB** | MongoDB `init-db.js` creates a restricted `app_user` on first boot |
| **Health Checks** | All 5 services with dependency-aware startup ordering |
| **Persistent Volumes** | `mongodb_data` + `redis_data` survive container restarts |
| **Redis Caching** | 30-second TTL cache with live cache-hit/miss telemetry dashboard |
| **Log Rotation** | `json-file` driver, 10 MB max, 3 files per container |
| **CRUD REST API** | `POST/GET/DELETE /api/items` with automatic cache invalidation |

---

## Services

| Service | Image | Container | Port |
|---|---|---|---|
| **Nginx Proxy** | `multi_service_application-proxy` | `app_proxy` | `8080→80` |
| **React Frontend** | `multi_service_application-frontend` | `app_frontend` | internal |
| **Express API** | `multi_service_application-backend` | `app_backend` | internal |
| **MongoDB** | `mongo:6` | `app_database` | internal |
| **Redis Cache** | `redis:7-alpine` | `app_cache` | internal |

---

## Project Structure

```
multi_service_application/
├── base-image/
│   └── Dockerfile          # Custom Node 20 Alpine base image
├── backend/
│   ├── Dockerfile          # Multi-stage Node.js API build
│   ├── server.js           # Express API with Redis caching
│   ├── package.json
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile          # Multi-stage React/Vite → Nginx build
│   ├── nginx.conf          # SPA routing, gzip, static asset caching
│   ├── src/
│   │   ├── App.jsx         # DockerOps dashboard UI
│   │   └── App.css         # Dark theme, glassmorphism styling
│   └── .dockerignore
├── database/
│   └── init-db.js          # MongoDB init script (creates app_user)
├── nginx/
│   └── nginx.conf          # Reverse proxy config for all services
├── secrets/
│   ├── db_password.txt     # MongoDB app_user password (gitignored)
│   └── db_root_password.txt# MongoDB root password (gitignored)
├── docker-compose.yml      # Full stack orchestration
├── setup.sh                # Linux/macOS setup helper
└── setup.ps1               # Windows PowerShell setup helper
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- Docker Compose v2 (included with Docker Desktop)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Lakshya1002/Multi-Service-Application.git
cd Multi-Service-Application
```

### 2. Create the secrets files

```bash
mkdir secrets
echo "your_app_password" > secrets/db_password.txt
echo "your_root_password" > secrets/db_root_password.txt
```

> The `secrets/` directory is `.gitignore`d and must be created manually before running.

### 3. Build the custom base image

```bash
docker build -t my-node-base:20-alpine ./base-image
```

### 4. Launch all services

```bash
docker-compose up --build -d
```

### 5. Open the dashboard

Navigate to **[http://localhost:8080](http://localhost:8080)**

---

## 📊 DockerOps Dashboard

The live React dashboard provides:

- **Service Grid** — real-time health status for all 5 services with network tier labels
- **CRUD Workbench** — insert/fetch/delete MongoDB documents and observe cache behavior
- **Caching Telemetry** — live query latency, cache hit/miss ratio, and data source indicator
- **Orchestration Highlights** — tabbed view of networking, secrets, health check, and volume configs

---

## API Endpoints

All API calls are proxied through Nginx at `http://localhost:8080/api/`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/items` | Fetch all items (Redis-cached, 30s TTL) |
| `POST` | `/api/items` | Insert a new item (invalidates cache) |
| `DELETE` | `/api/items/:id` | Delete an item by ID (invalidates cache) |
| `GET` | `/health` | Nginx proxy health check |
| `GET` | `/api/health` | Backend health (MongoDB + Redis status) |

---

## Testing the Cache

1. Click **Fetch Items** — first call hits MongoDB directly (~15–80ms)
2. Click **Fetch Items** again immediately — served from Redis cache (<5ms)
3. Click **Insert Document** — cache is invalidated
4. Click **Fetch Items** again — DB is queried again, then re-cached

---

## Security Model

- **No passwords in environment variables** — all secrets use Docker Secrets mounted at `/run/secrets/`
- **Network segmentation** — the frontend container can only reach the proxy; it cannot directly reach MongoDB or Redis
- **Least-privilege DB user** — the Express API connects as `app_user` with access scoped to `appdb` only
- **Non-root Node process** — the backend runs as the `node` system user inside the container

---

## Useful Commands

```bash
# View all container statuses and health
docker-compose ps

# Follow live logs from all services
docker-compose logs -f

# Follow logs from a specific service
docker-compose logs -f backend

# Open a shell inside the backend container
docker exec -it app_backend sh

# Tear down all containers and volumes
docker-compose down -v

# Rebuild a single service
docker-compose up --build -d backend
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.
