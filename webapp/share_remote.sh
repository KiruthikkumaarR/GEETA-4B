#!/usr/bin/env bash
# GEETA 4B - let parents open the portal from anywhere while this Mac is on.
#
# Uses a Cloudflare Tunnel: an outbound-only, HTTPS link from this Mac to a
# public https://....trycloudflare.com address. No router ports are opened and
# the web app itself still listens only on 127.0.0.1.
#
# What protects it: every page and API needs a sign-in (argon2 passwords,
# HttpOnly+Secure cookie, login throttling), the first admin account can only
# be created on this Mac itself, and only the app's own pages are served.
#
# Usage (web app must already be running on :8090):
#   ./webapp/share_remote.sh
# Stop sharing: Ctrl-C (the link stops working immediately).
#
# The quick-tunnel address CHANGES every time this starts. For a fixed address
# (e.g. geeta.yourdomain.com) set up a named tunnel with a Cloudflare account:
#   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
set -euo pipefail

PORT="${GEETA_PORT:-8090}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it with:  brew install cloudflared" >&2
  exit 1
fi
if ! curl -s -m 3 -o /dev/null "http://127.0.0.1:${PORT}/health"; then
  echo "GEETA isn't running on port ${PORT} - start it first: ./webapp/run_webapp.sh" >&2
  exit 1
fi

echo "Sharing GEETA (port ${PORT}) - look for the https://....trycloudflare.com line below."
echo "Send parents that link. Ctrl-C to stop sharing."
exec cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:${PORT}"
