#!/bin/sh
set -eu

CONTAINER_NAME="rito-backend-postgres"
IMAGE="postgres:17-alpine"
HOST_PORT="5434"
DB_NAME="rito_dev"
DB_USER="postgres"
DB_PASSWORD="rito"

wait_for_db() {
  tries=60
  while [ "$tries" -gt 0 ]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      echo "PostgreSQL is ready at localhost:$HOST_PORT"
      return 0
    fi
    tries=$((tries - 1))
    sleep 1
  done

  echo "PostgreSQL did not become ready in time." >&2
  docker logs "$CONTAINER_NAME" >&2 || true
  return 1
}

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Start Docker Desktop and try again." >&2
    exit 1
  fi
}

start_db() {
  require_docker

  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "PostgreSQL is already running: $CONTAINER_NAME"
    wait_for_db
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Starting existing PostgreSQL container: $CONTAINER_NAME"
    docker start "$CONTAINER_NAME" >/dev/null
    wait_for_db
    return
  fi

  echo "Creating PostgreSQL container: $CONTAINER_NAME"
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "127.0.0.1:$HOST_PORT:5432" \
    -v rito-backend-postgres-data:/var/lib/postgresql/data \
    "$IMAGE" >/dev/null

  wait_for_db
}

case "${1:-start}" in
  start)
    start_db
    ;;
  stop)
    require_docker
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "Stopped PostgreSQL container: $CONTAINER_NAME"
    ;;
  reset)
    require_docker
    docker rm -f -v "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker volume rm rito-backend-postgres-data >/dev/null 2>&1 || true
    start_db
    ;;
  *)
    echo "Usage: $0 {start|stop|reset}" >&2
    exit 2
    ;;
esac
