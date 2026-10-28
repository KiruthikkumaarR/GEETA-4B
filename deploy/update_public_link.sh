#!/usr/bin/env bash
# Keep https://kiruthikportfolio.com/app pointing at GEETA's current public address.
# The free quick-tunnel address changes on every restart; this writes the new one to the
# portfolio repo's app/url.json and pushes it (GitHub Pages serves it a minute later).
# Scheduled every 2 minutes by com.geeta.publink. Does nothing when the address is unchanged.
set -euo pipefail
cd "$(dirname "$0")/.."
PORTFOLIO="${GEETA_PORTFOLIO_DIR:-$HOME/Projects/kiruthikportfolio}"
FILE="$PORTFOLIO/app/url.json"

URL="$(./deploy/public_url.sh)"
[[ "$URL" =~ ^https://[a-z0-9-]+\.(trycloudflare\.com|kiruthikportfolio\.com)$ ]] || exit 0
[ -f "$FILE" ] && grep -q "\"$URL\"" "$FILE" && exit 0
# only publish an address that really answers (a fresh tunnel takes a few seconds)
code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$URL/" || true)"
[[ "$code" =~ ^(200|301|302|303|307)$ ]] || { echo "$(date '+%F %T') $URL not answering ($code), will retry"; exit 0; }

cd "$PORTFOLIO"
git pull -q --rebase --autostash
printf '{"url": "%s", "updated": "%s"}\n' "$URL" "$(date '+%Y-%m-%dT%H:%M:%S%z')" > app/url.json
git add app/url.json
git commit -q -m "Update GEETA app link" -- app/url.json
git -c credential.helper='!gh auth git-credential' push -q
echo "$(date '+%F %T') published $URL"
