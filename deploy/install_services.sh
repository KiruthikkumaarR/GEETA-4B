#!/usr/bin/env bash
# GEETA production: run everything as macOS LaunchAgents so it starts when you
# log in and restarts by itself if anything crashes.
#
#   ./deploy/install_services.sh            install / refresh all services
#   ./deploy/install_services.sh uninstall  stop + remove them
#
# Services (all run as YOU, no admin rights needed):
#   com.geeta.llama    the model server (127.0.0.1:8080)
#   com.geeta.webapp   the web app (127.0.0.1:8090)
#   com.geeta.awake    keeps the Mac from idle-sleeping while plugged in
#   com.geeta.backup   daily database backup (checked hourly, so a night with the Mac off is caught up)
#   com.geeta.tunnel   the public https address (own domain, or a free trycloudflare.com one)
#   com.geeta.publink  keeps kiruthikportfolio.com/app pointing at that address (every 2 min)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$ROOT/logs"
UID_N="$(id -u)"
SERVICES=(llama webapp awake backup tunnel publink)

mkdir -p "$AGENTS" "$LOGS"

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }

unload() {
  local label="com.geeta.$1"
  launchctl bootout "gui/$UID_N/$label" 2>/dev/null || true
  rm -f "$AGENTS/$label.plist"
}

if [ "${1:-}" = "uninstall" ]; then
  for s in "${SERVICES[@]}"; do unload "$s"; done
  echo "GEETA services removed."
  exit 0
fi

# write_agent NAME KEEPALIVE(true|false) EXTRA_XML CMD...
write_agent() {
  local name="$1" keep="$2" extra="$3"; shift 3
  local label="com.geeta.$name" args=""
  for a in "$@"; do args+="    <string>$(xml_escape "$a")</string>"$'\n'; done
  cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
$args  </array>
  <key>WorkingDirectory</key><string>$(xml_escape "$ROOT")</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StandardOutPath</key><string>$(xml_escape "$LOGS/service_$name.log")</string>
  <key>StandardErrorPath</key><string>$(xml_escape "$LOGS/service_$name.log")</string>
  <key>RunAtLoad</key><$keep/>
  <key>KeepAlive</key><$keep/>
  <key>ThrottleInterval</key><integer>10</integer>
$extra</dict>
</plist>
PLIST
  launchctl bootout "gui/$UID_N/$label" 2>/dev/null || true
  # bootout is asynchronous - wait until the old copy is really gone
  for _ in $(seq 1 20); do launchctl print "gui/$UID_N/$label" >/dev/null 2>&1 || break; sleep 0.5; done
  launchctl bootstrap "gui/$UID_N" "$AGENTS/$label.plist"
  echo "  started $label"
}

echo "Installing GEETA services from $ROOT"
write_agent llama  true "" "$ROOT/deploy/run_llama.sh"
write_agent webapp true "" "$ROOT/webapp/run_webapp.sh"
# -i: no idle sleep, -s: no system sleep while on AC power. Display can still sleep.
write_agent awake  true "" /usr/bin/caffeinate -i -s
write_agent backup false "  <key>StartInterval</key><integer>3600</integer>
" "$ROOT/deploy/backup_db.sh"

# nightly emails were removed (28 Oct 2026): parents see reports in the app. Clean up an old install.
launchctl bootout "gui/$UID_N/com.geeta.nightly" 2>/dev/null || true; rm -f "$AGENTS/com.geeta.nightly.plist"

# own domain if setup_tunnel.sh has run, otherwise a free quick-tunnel address
: > "$LOGS/service_tunnel.log"
write_agent tunnel true "" "$ROOT/deploy/run_tunnel.sh"
write_agent publink false "  <key>StartInterval</key><integer>120</integer>
" "$ROOT/deploy/update_public_link.sh"
echo "Done. Logs: $LOGS/service_*.log"
