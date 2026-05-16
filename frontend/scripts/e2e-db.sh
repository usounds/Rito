#!/bin/sh
set -eu

CONTAINER_NAME="${E2E_DB_CONTAINER_NAME:-rito-e2e-postgres}"
IMAGE="${E2E_DB_IMAGE:-postgres:16-alpine}"
HOST_PORT="${E2E_DB_PORT:-5433}"
DB_NAME="${E2E_DB_NAME:-rito_test}"
DB_USER="${E2E_DB_USER:-postgres}"
DB_PASSWORD="${E2E_DB_PASSWORD:-test}"

wait_for_db() {
  tries=60
  while [ "$tries" -gt 0 ]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      echo "Postgres is ready: postgresql://$DB_USER:$DB_PASSWORD@localhost:$HOST_PORT/$DB_NAME"
      return 0
    fi
    tries=$((tries - 1))
    sleep 1
  done

  echo "Postgres did not become ready in time." >&2
  docker logs "$CONTAINER_NAME" >&2 || true
  return 1
}

start_db() {
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Postgres is already running: $CONTAINER_NAME"
    wait_for_db
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Starting existing Postgres container: $CONTAINER_NAME"
    docker start "$CONTAINER_NAME" >/dev/null
    wait_for_db
    return
  fi

  echo "Creating Postgres container: $CONTAINER_NAME"
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$HOST_PORT:5432" \
    "$IMAGE" >/dev/null

  wait_for_db
}

case "${1:-start}" in
  start)
    start_db
    ;;
  wait)
    wait_for_db
    ;;
  stop)
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "Stopped Postgres container: $CONTAINER_NAME"
    ;;
  reset)
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    start_db
    ;;
  *)
    echo "Usage: $0 {start|wait|stop|reset}" >&2
    exit 2
    ;;
esac
