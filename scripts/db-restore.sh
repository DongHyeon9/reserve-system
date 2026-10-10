#!/usr/bin/env bash
# Restores an encrypted backup made by db-backup.sh into the database given by PG* variables.
# Destructive by design: existing objects of the backed-up schema are dropped and recreated (--clean), all inside one
# transaction, so a failure part-way leaves the database exactly as it was. Decryption fails on tampering.
# Usage: PGHOST=… PGUSER=… PGPASSWORD=… PGDATABASE=… BACKUP_PASSPHRASE=… scripts/db-restore.sh < backup.dump.gpg
set -euo pipefail
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
plain=$(mktemp)
trap 'rm -f "$plain"' EXIT
# Decrypt fully (and verify integrity) before touching the database.
gpg --batch --quiet --pinentry-mode loopback --decrypt --passphrase-file <(printf '%s' "$BACKUP_PASSPHRASE") --output - > "$plain"
docker run --rm -i -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE ${DOCKER_NETWORK:+--network "$DOCKER_NETWORK"} postgres:17-alpine \
  pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname="$PGDATABASE" < "$plain"
