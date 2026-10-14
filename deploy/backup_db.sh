#!/usr/bin/env bash
# Nightly copy of the portal database (accounts + learning summaries).
# Uses sqlite's online .backup (safe while GEETA is running). Keeps 30 days.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=data/portal/geeta_portal.db
DEST=data/portal/backups
[ -f "$DB" ] || exit 0
mkdir -p "$DEST"; chmod 700 "$DEST"
OUT="$DEST/geeta_portal-$(date +%Y%m%d-%H%M).db"
sqlite3 "$DB" ".backup '$OUT'"
chmod 600 "$OUT"
ls -1t "$DEST"/geeta_portal-*.db | tail -n +31 | while read -r old; do rm -f "$old"; done
echo "backup ok: $OUT"
