#!/usr/bin/env bash
# Nightly: email parents their child's daily PDF + email admins the technical report.
# Scheduled by com.geeta.nightly (deploy/install_services.sh). Safe to run by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
GEETA_RUN_NIGHTLY=1 exec .venv/bin/python - <<'PY'
import json, pathlib
root = pathlib.Path.cwd()
nb = json.loads((root / "tools" / "_nbmodule.ipynb").read_text())
exec("".join("".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"))
bootstrap(root)
import geeta.daily_reports   # runs the nightly job (GEETA_RUN_NIGHTLY=1)
PY
