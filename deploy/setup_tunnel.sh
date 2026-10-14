#!/usr/bin/env bash
# One-time: create the named Cloudflare Tunnel "geeta" and point your own
# domain name at it.
#
#   ./deploy/setup_tunnel.sh geeta.yourdomain.com
#
# Before this: `cloudflared tunnel login` (opens your browser - sign in to YOUR
# Cloudflare account and pick the domain). That saves ~/.cloudflared/cert.pem.
set -euo pipefail

HOST="${1:?usage: setup_tunnel.sh geeta.yourdomain.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF=/opt/homebrew/bin/cloudflared

[ -f "$HOME/.cloudflared/cert.pem" ] || { echo "Run '$CF tunnel login' first." >&2; exit 1; }

if ! "$CF" tunnel info geeta >/dev/null 2>&1; then
  "$CF" tunnel create geeta
fi
TUNNEL_ID="$("$CF" tunnel list --output json | python3 -c "import json,sys; print(next(t['id'] for t in json.load(sys.stdin) if t['name']=='geeta'))")"
CREDS="$HOME/.cloudflared/$TUNNEL_ID.json"
[ -f "$CREDS" ] || { echo "Missing tunnel credentials $CREDS" >&2; exit 1; }

cat > "$ROOT/deploy/cloudflared.yml" <<YML
# Cloudflare Tunnel for GEETA (made by setup_tunnel.sh). Credentials stay in ~/.cloudflared.
tunnel: $TUNNEL_ID
credentials-file: $CREDS
ingress:
  - hostname: $HOST
    service: http://127.0.0.1:8090
    originRequest:
      httpHostHeader: $HOST
  - service: http_status:404
YML

"$CF" tunnel route dns --overwrite-dns geeta "$HOST"
echo "Tunnel 'geeta' ($TUNNEL_ID) -> https://$HOST"
echo "Now run: ./deploy/install_services.sh   (adds the tunnel service)"
