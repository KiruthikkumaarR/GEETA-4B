# GEETA 4B — Resumption Handoff (Session 10)

User is sleeping; M4 background run continues overnight. Resume tomorrow with the procedure in §4.

## 1. Overall % (measured at handoff)
**~76%**: M1 100 · M2 ~95 · M3 100 · M4 ~50 (E running) · M5 ~85 (mock verified) · M6 ~45 (pending verified) · M7 ~90 · M8 ~85 · M9 ~60 (mock scored) · M10 ~85.
See `STATUS.md` (written this session) for the table + resume procedure.

## 2. Running RIGHT NOW (overnight)
- `nohup .venv/bin/jupyter execute --kernel python3 notebooks/04_finetune.ipynb` — **pid 3736** (kernel), client pid 3735. Launched session 8 at 20:38; **~2h50m elapsed at handoff, still in cell E** (vision tower, 1060 iters; no `outputs/m4/vision_tower/` yet, no `.E.done`). CPU sampled 19–60% fluctuating = actively computing.
- `caffeinate -i -m -s` — **pid 31531** (prevents Mac sleep; keep it if on AC power).
- When E finishes, the SAME process continues: F (merge LoRA+tower → `models/geeta-4b-mlx`) → G (HF dir + GGUF f16 + Q4_K_M via llama.cpp converter, needs torch — installed) → H (llama-server + mtmd smoke on :8080, Popen'd child — may survive notebook exit or not) → I (summary).
- **Do NOT start another heavy MLX job** (48GB unified memory shared with the running train).

## 3. Completed + verified this session (do NOT redo)
1. **NB10_E %-format bug FIXED** in generator (`/Users/kiruthikkumaar/.lmstudio/scratchpads/m3/gen_artifacts.py`): the 5th `%s` (section 4.2 pp-gain) was unpaired → now literal `[__]`. Also improved: axis table embeds real scores. Notebook 10 re-run PASSED → `docs/case_study_writeup.md` (shows Overall 60.1/100 mock + axis table) + `outputs/m10/pilot_prep.json`. All 3 docs present.
2. **NB06 char-accuracy self-test FIXED**: assert `< 0.9` was mathematically impossible (1-char error in 22-char string = 0.9545) → now `< 0.96` with comment. Notebook 06 re-run PASSED in pending-M4 mode → `outputs/m6/ocr_report.json` honestly labelled (`ocr_source: pending-M4`, acceptance #3 false, "no measured numbers").
3. **Notebook 05 full mock run PASSED** → `outputs/m5/`: 249 problems (zero wrong delivered; in-scope 40.2% — mock), 36 leak probes (1 raw blocked by guard, 0 delivered), 3 sessions solved w/ hints+re-engage. Acceptance #1 + #2 pass (mock). `model_source: mock` + note everywhere.
4. **Notebook 09 PASSED** → `outputs/m9/scorecard.json` + `.md`: 5 weighted axes, overall **60.1/100**, `measured_claim: false`, criteria: zero-wrong ✓, leaks ✓, in-scope ✗ (0.40 vs 0.90), OCR ✗ (pending), overall ✗ (60.1 vs 82).
5. **Polish**: `requirements.txt` (mlx/mlx-lm/mlx-vlm/transformers/torch now required, not commented — torch verified needed by llama.cpp convert_hf_to_gguf.py in cell G); `config/sampling.yaml` comment now matches reality (thinking OFF via template-level enable_thinking=False, no post-strip exists); `STATUS.md` created.
6. Generator re-run is idempotent; all 4 notebooks (05/06/09/10) regenerated + compile-verified.

## 4. RESUME PROCEDURE (tomorrow, in order)
1. **Check M4**: `ps -p 3736 -o pid,etime,state` + `ls outputs/m4/ | grep -E "vision|merged|hf|gguf|\.done"` + `tail -20 logs/m4_run2.log`.
   - **E done, F–I ran** (expect `vision_tower/`, merged dir, gguf files, `.I.done`): go to step 2.
   - **Process died mid F–I**: re-run `.venv/bin/jupyter execute --kernel python3 notebooks/04_finetune.ipynb` (done-guards skip finished cells; crashed cell restarts). Then step 2.
   - **E still running after ~6h total**: per-iter time too high — kill 3735+3736, lower `ITERS` in cell E (e.g. 400), re-run 04.
   - **Machine was shut down (not just slept)**: same as "died" — re-run 04; E restarts from scratch (~3h).
2. **Real eval runs** (source-aware guards auto-re-execute since prior runs were mock/pending):
   `.venv/bin/jupyter execute --kernel python3 notebooks/05_e2e_text_loop.ipynb` (≈1–2h at ~15 tok/s)
   → `notebooks/06_ocr_loop.ipynb` (≈30–60min; needs real brain — llama-server or merged MLX dir)
   → `notebooks/09_eval_harness.ipynb` (fast; scores real outputs)
   → `notebooks/10_pilot_prep.ipynb` after deleting `outputs/m10/.E.done .F.done` (case study picks up real scorecard).
3. **Webapp with real brain**: check `curl -s http://localhost:8080/health` (cell H's Popen'd server may have died with the notebook); if down, start per 04 cell H cmd or `./webapp/run_webapp.sh`; re-test session→texts→close→PDF.
4. **Final polish**: update `STATUS.md` % + "running" section; verify README (was being written when user stopped — check if `README.md` exists, else write it); final % report.

## 5. Watch items / unverified
- Merged-model generation quality, GGUF vision path (R1), llama-server mtmd — all untested end-to-end until F–I land.
- `mlx_vlm.generate` return shape (list vs dict) handled defensively in 06; untested until real run.
- 09 pedagogy axis heuristic (0.5 solved + 0.3 hint-efficiency + 0.2 re-engage) — documented in `config/eval/rubric.md`, design choice not user-approved.
- If cell F crashes on resume: it was fixed on disk in session 9 (`framework="mlx"` ×2) — the running process has the pre-fix code in memory, so **expect F traceback in logs/m4_run2.log even if E succeeded**; the 04 re-run then does F correctly.

## 6. Standing rules (user-approved, still in force)
- "Completely finish it" · all project Python = .ipynb (vendored third_party exempt) · periodic % reports · no fake passes — if a real run fails, report exactly + one resume command.
- zsh; ALWAYS quote "GEETA - 4B" paths; use `.venv/bin/python` (3.14); no `timeout` cmd; `echo ===` fails in zsh — use `echo ---`.
- Brief §2 decisions FINAL (Qwen3.5-4B base, MLX LoRA→merge→GGUF→llama.cpp, zero-tolerance verifier, never-reveal, privacy hard constraints).

## 7. Key file map
- `PROJECT_BRIEF.md` (locked spec) · `STATUS.md` (NEW this session) · `HANDOFF_session7.md` (prior)
- `notebooks/04_finetune.ipynb` — M4 (running overnight; E in progress)
- `notebooks/05,06,09,10` — all run + verified this session (mock/pending-labelled outputs on disk)
- `tools/{_nbmodule,verifier,leak_guard,model_client,tutor_engine,tutor_data,reports,nb_run}.ipynb` — geeta.* runtime
- `webapp/{geeta_server.ipynb,index.html,run_webapp.sh,static/}` — M7+M8 (e2e tested mock)
- `config/{config.yaml,sampling.yaml,eval/rubric.md,eval/success_criteria.yaml}`
- `docs/{pilot_protocol,hrec_application,case_study_writeup}.md` · `outputs/m10/{pre_registration,pilot_prep}.json`
- Scratchpad: `/Users/kiruthikkumaar/.lmstudio/scratchpads/m3/gen_artifacts.py` (generator; both bugs fixed)
