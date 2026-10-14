#!/usr/bin/env bash
# Print GEETA's current public address (quick-tunnel addresses change on restart).
cd "$(dirname "$0")/.."
if [ -f deploy/cloudflared.yml ]; then
  awk '/hostname:/{print "https://"$3; exit}' deploy/cloudflared.yml
else
  grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' logs/service_tunnel.log 2>/dev/null | tail -1
fi
