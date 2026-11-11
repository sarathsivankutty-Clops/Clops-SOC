#!/usr/bin/env bash
# Preflight check for deploying the isolated `clops-soc` preview stack
# alongside an existing `aisoc-*` stack on the same EC2 host.
#
# Checks:
#   1. .env presence and non-placeholder PUBLIC_HOST warning
#   2. Every published host port in .env (or compose default) is free via `ss -ltn`
#      and does not collide with the existing aisoc-* stack ports
#   3. No existing containers named `clops-soc-*` / `clops-soc_*`
#   4. Local availability of backend images (since pull_policy: never is set)
#   5. Adequate free RAM and root disk space (`free -h`, `df -h /`)
#
# Never touches or modifies containers outside `clops-soc`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${1:-${REPO_ROOT}/.env}"

FAIL=0
WARN=0

pass() { printf '  [PASS] %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; WARN=$((WARN + 1)); }
fail() { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL + 1)); }

get_env_val() {
  local key="$1"
  local default="$2"
  local val=""
  if [[ -f "${ENV_FILE}" ]]; then
    val="$(grep -E "^[[:space:]]*${key}=" "${ENV_FILE}" | tail -n1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true)"
  fi
  if [[ -n "${val}" ]]; then
    printf '%s' "${val}"
  else
    printf '%s' "${default}"
  fi
}

printf '=== clops-soc EC2 Shared-Host Preflight ===\n'

# ── 1. Environment file ──────────────────────────────────────────────────────
if [[ -f "${ENV_FILE}" ]]; then
  pass "Found env file: ${ENV_FILE}"
else
  fail "Missing ${ENV_FILE} (run: cp .env.example .env && cat .env.ec2.example >> .env && python3 scripts/ensure_env.py)"
fi

PUBLIC_HOST="$(get_env_val PUBLIC_HOST localhost)"
AISOC_VERSION="$(get_env_val AISOC_VERSION latest)"
WEB_PORT="$(get_env_val WEB_PORT 13000)"
REALTIME_PORT="$(get_env_val REALTIME_PORT 18086)"
API_PORT="$(get_env_val API_PORT 18000)"
AGENTS_PORT="$(get_env_val AGENTS_PORT 18001)"
ACTIONS_PORT="$(get_env_val ACTIONS_PORT 18002)"
FUSION_PORT="$(get_env_val FUSION_PORT 18003)"
THREATINTEL_PORT="$(get_env_val THREATINTEL_PORT 18005)"
INGEST_HTTP_PORT="$(get_env_val INGEST_HTTP_PORT 18081)"
INGEST_METRICS_PORT="$(get_env_val INGEST_METRICS_PORT 19090)"
CONNECTORS_PORT="$(get_env_val CONNECTORS_PORT 18088)"
LITELLM_PORT="$(get_env_val LITELLM_PORT 14000)"
QDRANT_PORT="$(get_env_val QDRANT_PORT 16333)"
OLLAMA_PORT="$(get_env_val OLLAMA_PORT 21434)"

if [[ "${PUBLIC_HOST}" == "localhost" || "${PUBLIC_HOST}" == "127.0.0.1" ]]; then
  warn "PUBLIC_HOST is '${PUBLIC_HOST}'. External browsers will need PUBLIC_HOST set to your EC2 IP/DNS before 'docker compose build web'."
elif [[ "${PUBLIC_HOST}" =~ ^(your-|change|<) ]]; then
  fail "PUBLIC_HOST appears to be a placeholder ('${PUBLIC_HOST}'). Set it to your EC2 IP or DNS name."
else
  pass "PUBLIC_HOST=${PUBLIC_HOST}"
fi

# ── 2. Port checks (ss -ltn) ─────────────────────────────────────────────────
printf '\n--- Port availability (ss -ltn) ---\n'
if ! command -v ss >/dev/null 2>&1; then
  fail "'ss' command not found (install iproute2) — cannot verify listening ports"
else
  LISTENING_PORTS="$(ss -ltnH | awk '{print $4}' | sed -nE 's/.*:([0-9]+)$/\1/p' | sort -u)"

  RESERVED_EXISTING="3000 8000 8001 8003 8081 8086 8088 9090 9092 5432 6379 2181 8087"
  PORT_ENTRIES=(
    "WEB_PORT:${WEB_PORT}"
    "REALTIME_PORT:${REALTIME_PORT}"
    "API_PORT:${API_PORT}"
    "AGENTS_PORT:${AGENTS_PORT}"
    "ACTIONS_PORT:${ACTIONS_PORT}"
    "FUSION_PORT:${FUSION_PORT}"
    "THREATINTEL_PORT:${THREATINTEL_PORT}"
    "INGEST_HTTP_PORT:${INGEST_HTTP_PORT}"
    "INGEST_METRICS_PORT:${INGEST_METRICS_PORT}"
    "CONNECTORS_PORT:${CONNECTORS_PORT}"
    "LITELLM_PORT:${LITELLM_PORT}"
    "QDRANT_PORT:${QDRANT_PORT}"
    "OLLAMA_PORT:${OLLAMA_PORT}"
  )

  SEEN_PORTS=""
  for entry in "${PORT_ENTRIES[@]}"; do
    name="${entry%%:*}"
    port="${entry#*:}"

    if ! [[ "${port}" =~ ^[0-9]+$ ]] || (( port < 1 || port > 65535 )); then
      fail "${name}=${port} is not a valid TCP port"
      continue
    fi

    if printf '%s\n' "${RESERVED_EXISTING}" | tr ' ' '\n' | grep -qx "${port}"; then
      fail "${name}=${port} collides with reserved port used by the existing aisoc-* stack"
      continue
    fi

    if printf '%s\n' "${SEEN_PORTS}" | grep -qx "${port}"; then
      fail "${name}=${port} duplicates another clops-soc host port in .env"
      continue
    fi
    SEEN_PORTS="${SEEN_PORTS}"$'\n'"${port}"

    if printf '%s\n' "${LISTENING_PORTS}" | grep -qx "${port}"; then
      fail "${name}=${port} is already bound on this host (see: ss -ltnp 'sport = :${port}')"
    else
      pass "${name}=${port} is free"
    fi
  done
fi

# ── 3. Container name collision check ────────────────────────────────────────
printf '\n--- Container check (clops-soc-*) ---\n'
if ! command -v docker >/dev/null 2>&1; then
  fail "'docker' command not found"
else
  EXISTING_CLOPS="$(docker ps -a --format '{{.Names}}' | grep -E '^clops-soc[-_]' || true)"
  if [[ -n "${EXISTING_CLOPS}" ]]; then
    fail "Existing clops-soc containers detected (remove this project's containers first): $(printf '%s' "${EXISTING_CLOPS}" | tr '\n' ' ')"
  else
    pass "No existing clops-soc-* containers found"
  fi

  printf '\n--- Backend local image check (pull_policy: never) ---\n'
  REQUIRED_IMAGES=(
    "ghcr.io/beenuar/aisoc-core-api:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-ingest:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-fusion:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-agents:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-actions:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-connectors:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-threatintel:${AISOC_VERSION}"
    "ghcr.io/beenuar/aisoc-realtime:${AISOC_VERSION}"
  )
  for img in "${REQUIRED_IMAGES[@]}"; do
    if docker image inspect "${img}" >/dev/null 2>&1; then
      pass "Local image present: ${img}"
    else
      warn "Local image missing: ${img} (with pull_policy: never, compose up expects this tag locally unless you uncomment build: for local builds)"
    fi
  done
fi

# ── 4. Memory & Disk checks ──────────────────────────────────────────────────
printf '\n--- Host resources (free -h / df -h /) ---\n'
if command -v free >/dev/null 2>&1; then
  free -h
  AVAIL_MB="$(free -m | awk '/^Mem:/ {print $7}')"
  if [[ -n "${AVAIL_MB}" ]] && (( AVAIL_MB < 2048 )); then
    fail "Available RAM is ${AVAIL_MB} MiB (< 2048 MiB minimum for isolated second stack alongside existing stack)"
  elif [[ -n "${AVAIL_MB}" ]] && (( AVAIL_MB < 4096 )); then
    warn "Available RAM is ${AVAIL_MB} MiB (< 4096 MiB recommended with bundled ollama/litellm)"
  else
    pass "Available RAM: ${AVAIL_MB:-unknown} MiB"
  fi
else
  warn "'free' command not available"
fi

printf '\n'
df -h /
AVAIL_DISK_MB="$(df -Pm / | awk 'NR==2 {print $4}')"
if [[ -n "${AVAIL_DISK_MB}" ]] && (( AVAIL_DISK_MB < 5120 )); then
  fail "Free disk on / is ${AVAIL_DISK_MB} MiB (< 5120 MiB minimum for web image build + volumes)"
elif [[ -n "${AVAIL_DISK_MB}" ]] && (( AVAIL_DISK_MB < 15360 )); then
  warn "Free disk on / is ${AVAIL_DISK_MB} MiB (< 15360 MiB recommended)"
else
  pass "Free disk on /: ${AVAIL_DISK_MB:-unknown} MiB"
fi

printf '\n=== Preflight Summary: %d failed, %d warning(s) ===\n' "${FAIL}" "${WARN}"
if (( FAIL > 0 )); then
  exit 1
fi
exit 0
