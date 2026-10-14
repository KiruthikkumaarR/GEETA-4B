#!/usr/bin/env bash
# Run GEETA's full test suite (needs the model server running on :8080):
#   13 quality (hallucination / chat / worksheets / bank / sweep)
#   14 security (attacks on a throwaway copy)
#   15 features (every role end to end on a throwaway copy)
# Each notebook fails loudly on any failed check. Summaries: outputs/tests/*.json
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
for nb in 13_hallucination_eval 14_security_suite 15_features_suite; do
  echo "== $nb"
  if .venv/bin/jupyter execute --kernel_name python3 "notebooks/$nb.ipynb" > "logs/test_$nb.log" 2>&1; then
    echo "   PASSED"
  else
    echo "   FAILED - see logs/test_$nb.log"; fail=1
  fi
done
.venv/bin/python - <<'PY'
import json, pathlib
for f in ("quality", "security", "features"):
    p = pathlib.Path("outputs/tests") / f"{f}.json"
    if p.exists():
        d = json.loads(p.read_text())
        print(f"{f:9s}", f"{d['passed']}/{d['total']} checks" if "total" in d else ("PASSED" if d.get("passed") else "FAILED"), "-", d.get("when"))
PY
exit $fail
