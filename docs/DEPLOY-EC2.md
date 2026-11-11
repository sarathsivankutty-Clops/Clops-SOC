# Deploying `clops-soc` Preview Stack on a Shared EC2 Host

This guide deploys the **CloudifyOps SOC (`clops-soc`)** preview UI alongside an already-running `aisoc-*` stack on the same EC2 instance without modifying or disturbing the existing containers, volumes, networks, images, or ports.

> **IMPORTANT — Do not enable profiles on the shared host.**
> Run only the default services (`docker compose up -d` with **no** `--profile` flags). Profiled services (`full`, `extras`, `osquery`, `chatops`, `mcp`, `monitoring`) are outside the preview scope and keep legacy loopback ports (`8080`, `8090`, `9200`, `8123`, `9000`, `7474`, `7687`, `3001`, etc.).

---

## Architecture & Isolation Guarantees

* **Project / Network / Volumes**: Top-level `name: clops-soc` isolates all named volumes under `clops-soc_*` (`clops-soc_postgres_data`, `clops-soc_redis_data`, `clops-soc_kafka_data`, etc.) and connects services over a dedicated bridge network `clops-soc-net`.
* **No fixed `container_name`**: All `aisoc-*` container names were removed; Compose names containers `clops-soc-<service>-1`.
* **Datastores unpublished**: `postgres`, `redis`, `kafka`, and `zookeeper` publish no host ports at all and are reached solely by service DNS name inside `clops-soc-net`.
* **Only `web` is built locally**: `web` builds from `./apps/web/Dockerfile` and tags `clops-soc-web:${TAG:-local}`.
* **Backend images (`pull_policy: never`)**: First-party backend services (`api`, `ingest-worker`, `fusion`, `agents`, `actions`, `connectors`, `threatintel`, `realtime`) keep their existing `ghcr.io/beenuar/aisoc-*:${AISOC_VERSION:-latest}` image names with `pull_policy: never` and their `build:` blocks commented out, so `docker compose build` / `up` never pulls or retags images used by the existing stack.
  * **Assumption**: This assumes the backend code on `deploy/ec2-compose` is compatible with those existing local images. If you later change backend code, uncomment the `# build:` block on that service in `docker-compose.yml` and change its `image:` to `clops-soc-<service>:${TAG:-local}`.
* **Do not use `make up` on the shared EC2 host**: The `Makefile`'s `up` target invokes `_refresh` (which runs `docker compose pull`) and prints legacy URLs. Use the explicit `docker compose` commands below instead.

---

## Resolved Port Mapping (Defaults)

| Service | Host Bind | Env Variable | Default Host Port | Container Port | Notes |
| --- | --- | --- | --- | --- | --- |
| `web` | `0.0.0.0` (public) | `WEB_PORT` | `13000` | `3000` | Next.js console + same-origin `/api/v1/*` proxy |
| `realtime` | `0.0.0.0` (public) | `REALTIME_PORT` | `18086` | `4000` | WebSocket (`NEXT_PUBLIC_WS_URL`) + SSE; internal `PORT=4000` |
| `api` | `127.0.0.1` | `API_PORT` | `18000` | `8000` | Core FastAPI (`REALTIME_BASE_URL=http://realtime:4000`) |
| `agents` | `127.0.0.1` | `AGENTS_PORT` | `18001` | `8084` | Triage / Copilot / Investigation orchestrator |
| `actions` | `127.0.0.1` | `ACTIONS_PORT` | `18002` | `8085` | Response actions executor |
| `fusion` | `127.0.0.1` | `FUSION_PORT` | `18003` | `8003` | Correlation & detection engine |
| `threatintel` | `127.0.0.1` | `THREATINTEL_PORT` | `18005` | `8005` | Threat intel feed worker |
| `ingest-worker` | `127.0.0.1` | `INGEST_HTTP_PORT` | `18081` | `8080` | Event ingest HTTP API |
| `ingest-worker` | `127.0.0.1` | `INGEST_METRICS_PORT` | `19090` | `9090` | Ingest Prometheus `/metrics` |
| `connectors` | `127.0.0.1` | `CONNECTORS_PORT` | `18088` | `8003` | Connector polling & registry |
| `litellm` | `127.0.0.1` | `LITELLM_PORT` | `14000` | `4000` | LLM gateway |
| `qdrant` | `127.0.0.1` | `QDRANT_PORT` | `16333` | `6333` | Vector store |
| `ollama` | `127.0.0.1` | `OLLAMA_PORT` | `21434` | `11434` | Bundled local model runtime |
| `postgres` | _unpublished_ | — | — | `5432` | Internal to `clops-soc-net` only |
| `redis` | _unpublished_ | — | — | `6379` | Internal to `clops-soc-net` only |
| `kafka` | _unpublished_ | — | — | `29092` / `9092` | Internal (`kafka:29092`) |
| `zookeeper` | _unpublished_ | — | — | `2181` | Internal to `clops-soc-net` only |

---

## How Secrets Are Generated

`.env.example` intentionally leaves all **15** required secret keys empty so no published placeholder reaches the application. Running `python3 scripts/ensure_env.py`:

1. Copies `.env.example` to `.env` if `.env` does not exist yet.
2. Populates every empty or placeholder secret (`AISOC_CREDENTIAL_KEY`, `SECRET_KEY`, `AISOC_SERVICE_TOKEN`, `AISOC_ACTIONS_SERVICE_TOKEN`, `AISOC_AGENTS_SERVICE_TOKEN`, `AISOC_API_SERVICE_TOKEN`, `AISOC_REALTIME_JWT_SECRET`, `REALTIME_INTERNAL_TOKEN`, `AISOC_INTERNAL_TOKEN`, `METRICS_TOKEN`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `AISOC_APP_DB_PASSWORD`, `REDIS_PASSWORD`, `CLICKHOUSE_PASSWORD`) with fresh random values using Python's `secrets` / `os.urandom` (`urlsafe_b64encode` for the Fernet vault key, hex for DB/Redis passwords so DSNs avoid URL-escaping issues, URL-safe tokens for service bearers and JWT keys).
3. Sets file permissions on `.env` to `0600` (`chmod 600`) and leaves all non-secret settings (`PUBLIC_HOST`, ports, `AISOC_CORS_ORIGINS`, etc.) untouched on subsequent runs.

---

## Step-by-Step EC2 Commands

Run everything from a **separate clone directory** (do not overwrite the existing `aisoc` checkout):

### 1. Clone and check out `deploy/ec2-compose`

```bash
git clone -b deploy/ec2-compose https://github.com/sarathsivankutty-Clops/Clops-SOC.git ~/clops-soc
cd ~/clops-soc
```

### 2. Create `.env`, append EC2 port overrides, and generate secrets

```bash
cp .env.example .env
cat .env.ec2.example >> .env
# Set PUBLIC_HOST to your EC2 public IP or DNS name BEFORE building web!
sed -i 's/^PUBLIC_HOST=.*/PUBLIC_HOST=<EC2_PUBLIC_IP_OR_DNS>/' .env
python3 scripts/ensure_env.py
```

*(Optionally add `OPENAI_API_KEY` / `GROQ_API_KEY` and model variables to `.env`, or leave empty to use bundled Ollama.)*

### 3. Open EC2 Security Group ports

Allow inbound TCP only for:
* `13000` (`WEB_PORT` — UI console)
* `18086` (`REALTIME_PORT` — live WebSocket updates)

Keep `18000`–`18088`, `19090`, `14000`, `16333`, `21434` closed in the Security Group (they bind `127.0.0.1` only).

### 4. Run preflight checks

```bash
bash scripts/preflight.sh
```

Verify every check prints `[PASS]` (port checks via `ss -ltn`, no `clops-soc-*` container conflict, adequate RAM/disk, local backend images present).

### 5. Build ONLY `web` and start the default stack

```bash
docker compose build web
docker compose up -d
```

> **Rebuild note**: `NEXT_PUBLIC_WS_URL` (`ws://${PUBLIC_HOST}:${REALTIME_PORT}`) and `NEXT_PUBLIC_REALTIME_URL` (`http://${PUBLIC_HOST}:${REALTIME_PORT}`) are compiled into client-side JavaScript during `docker compose build web`. If you later change `PUBLIC_HOST` or `REALTIME_PORT` in `.env`, rebuild and recreate `web`:
> ```bash
> docker compose build web && docker compose up -d web
> ```

### 6. Bootstrap the initial administrator account

```bash
docker compose run --rm -T api python -m app.scripts.bootstrap_admin
```

### 7. Verify health & access

```bash
docker compose ps
curl -sf http://127.0.0.1:18000/readyz
curl -sf http://127.0.0.1:13000/api/health
```

Browse to `http://<PUBLIC_HOST>:13000`.

### Safe Stop / Cleanup (leaves the other stack untouched)

```bash
# Stop clops-soc containers, keep volumes:
docker compose down

# Stop clops-soc containers and remove clops-soc volumes only:
docker compose down -v
```
