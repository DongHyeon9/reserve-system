#!/usr/bin/env bash
# Encrypted logical backup of the application schema. Backups contain personal data, so plaintext never touches disk.
# GPG symmetric encryption (AES-256) is authenticated: a tampered or truncated file fails to decrypt instead of restoring.
# Usage: PGHOST=… PGPORT=5432 PGUSER=… PGPASSWORD=… PGDATABASE=postgres BACKUP_PASSPHRASE=… scripts/db-backup.sh [schema] > backup.dump.gpg
set -euo pipefail
schema="${1:-popspot}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE ${DOCKER_NETWORK:+--network "$DOCKER_NETWORK"} postgres:17-alpine \
  pg_dump --format=custom --schema="$schema" --no-owner --no-privileges \
  | gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 \
      --passphrase-file <(printf '%s' "$BACKUP_PASSPHRASE") --output -
