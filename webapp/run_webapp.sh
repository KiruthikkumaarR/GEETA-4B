#!/usr/bin/env bash
# GEETA 4B - launch the kid-facing web app (M7 / C7).
#
# Serves webapp/ (index.html + static) and the /api session endpoints on port 8090.
# The tutor brain comes from get_model(): the served llama-server (port 8080) if it
# is up, otherwise the clearly-labelled MockModel (config model.allow_mock_model).
#
# Usage:
#   ./run_webapp.sh                 # port 8090
#   GEETA_PORT=9000 ./run_webapp.sh # custom port
#
# Privacy: session state is in-memory only; uploaded images are OCR'd then deleted.
set -euo pipefail

cd "$(dirname "$0")/.."          # project root (so the notebook bootstrap resolves)

PY=".venv/bin/python"
if [ ! -x "$PY" ]; then
  echo "ERROR: $PY not found. Activate/create the venv first (see README)." >&2
  exit 1
fi

PORT="${GEETA_PORT:-8090}"
export GEETA_RUN_SERVER=1        # lets the notebook's run-cell start uvicorn
export GEETA_PORT="$PORT"

echo "Starting GEETA web app on http://127.0.0.1:${PORT}"
echo "  (tutor brain: llama-server on :8080 if up, else labelled mock)"
echo "  Ctrl-C to stop."

# Load the notebook as a REAL module (registers geeta.* + defines `app`), then run uvicorn.
# We exec into a proper types.ModuleType registered in sys.modules (NOT a plain dict):
# Pydantic resolves model classes by their __module__, so a real module is required.
# Cells are joined into ONE file; any `from __future__ import ...` lines are hoisted
# to the top (legal per-cell in Jupyter, illegal mid-file) - same rule as tools/_nbmodule.
"$PY" - <<'PYEOF'
import json, pathlib, re, types, sys

ROOT = pathlib.Path.cwd()
nb_path = ROOT / "webapp" / "geeta_server.ipynb"
nb = json.loads(nb_path.read_text())
chunks = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
source = "\n\n".join(chunks)
fut, kept = [], []
for line in source.splitlines(keepends=True):
    if re.match(r"^\s*from\s+__future__\s+import\s+\S.*$", line):
        names = line.strip()[len("from __future__ import"):].strip()
        if names not in fut:
            fut.append(names)
        continue
    kept.append(line)
if fut:
    source = "".join("from __future__ import " + f + "\n" for f in fut) + "".join(kept)

mod = types.ModuleType("geeta_webapp_server")
mod.__file__ = str(nb_path)
sys.modules["geeta_webapp_server"] = mod
exec(compile(source, str(nb_path), "exec"), mod.__dict__)
# the run-cell is gated on GEETA_RUN_SERVER=1 (set above) -> uvicorn starts here
PYEOF
