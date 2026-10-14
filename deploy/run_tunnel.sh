#!/usr/bin/env bash
# Public https address -> this Mac's GEETA (127.0.0.1:8090).
#  - with deploy/cloudflared.yml (own domain, from setup_tunnel.sh): fixed address
#  - without it: free Cloudflare "quick tunnel" - a random https://....trycloudflare.com
#    address that CHANGES each time this starts. See it with: ./deploy/public_url.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CF=/opt/homebrew/bin/cloudflared
if [ -f deploy/cloudflared.yml ]; then
  exec "$CF" tunnel --no-autoupdate --config deploy/cloudflared.yml run geeta
fi
exec "$CF" tunnel --no-autoupdate --url http://127.0.0.1:8090
