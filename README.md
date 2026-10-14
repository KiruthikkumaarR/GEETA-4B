# GEETA 4B

A small (4B-parameter), purpose-built AI maths homework tutor for **Australian children in Grades 1–3 (ages ~6–8)** — running fully local on an Apple M4 Max.

The kid shows homework (pen on a web board, photo/scan, text, or voice) → GEETA reads the handwriting (OCR) → **confirms the text with the kid** → guides them step-by-step to work it out **themselves**.

**Two hard guarantees, enforced in code (not by prompt):**
- **Never reveals the actual homework answer** — adversarial-probe tested (leak guardrail).
- **Never delivers a wrong calculation** — every answer is recomputed by an independent Python verifier (sympy); zero tolerance, logged as proof.

After each session the parent gets an **auto PDF report** (what was learned, time taken, confidence, engagement, charts).

Full execution spec: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) · Live status: [STATUS.md](STATUS.md)

## Architecture

**One model does everything.** Base: **Qwen3.5-4B** (unified vision+text, Apache 2.0) → GEETA fine-tune:

```
Qwen3.5-4B (MLX 8-bit)
  ├─ text LoRA        (706 hint-ladder / never-reveal / re-engagement dialogues)
  ├─ vision-tower ft  (1060 handwriting rows, custom MLX loop)
  └─ merge → HF dir → GGUF (f16 + Q4_K_M) → llama.cpp server + mtmd vision
```

Around the model, a Python safety stack (all in `tools/`):

| Component | Role |
|---|---|
| `verifier.ipynb` | Independent sympy recomputation; wrong answers are never delivered |
| `leak_guard.ipynb` | Blocks answer-leaks in model output before the kid sees it |
| `tutor_engine.ipynb` | Hint ladder, drift→re-engage loop, kid-confirm OCR step |
| `model_client.ipynb` | llama-server /v1 client (falls back to a mock for pipeline tests) |
| `reports.ipynb` | Parent PDF (reportlab) + dev report |

## Repository layout

```
GEETA - 4B/
├── PROJECT_BRIEF.md        # execution spec (locked decisions, milestones, acceptance)
├── STATUS.md               # live milestone status + resume procedure
├── requirements.txt        # all deps (incl. MLX stack + torch for GGUF conversion)
├── config/                 # config.yaml, sampling.yaml, eval/{rubric.md, success_criteria.yaml}
├── data/                   # bank/ (1090 ACARA Y1–3), splits/, eval/ (held-out sets), processed/
├── models/                 # base MLX model; merged geeta-4b-mlx + GGUF after M4
├── notebooks/              # the whole pipeline, 00→10 (all project Python is .ipynb)
├── tools/                  # geeta.* runtime modules (notebook-as-module pattern)
├── webapp/                 # M7+M8: geeta_server.ipynb, board/text/voice UI, run_webapp.sh
├── docs/                   # pilot protocol, HREC application, case-study write-up
├── outputs/                # m1–m10 milestone outputs (done-flags + JSON/MD reports)
├── logs/                   # run logs
└── third_party/            # llama.cpp (vendored; exempt from the .ipynb rule)
```

## Quickstart

```bash
cd "GEETA - 4B"
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# pipeline (in order; each notebook is resumable via done-flags in outputs/):
.venv/bin/jupyter execute --kernel python3 notebooks/00_environment_setup.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/01_acara_skill_map_and_problem_bank.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/02_pdf_to_json_pipeline.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/03_dataset_assembly.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/04_finetune.ipynb      # the long one (~2h)
.venv/bin/jupyter execute --kernel python3 notebooks/05_e2e_text_loop.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/06_ocr_loop.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/09_eval_harness.ipynb
.venv/bin/jupyter execute --kernel python3 notebooks/10_pilot_prep.ipynb

# full test suite (quality + security + features):
./deploy/run_all_tests.sh

# the app:
./webapp/run_webapp.sh        # → http://127.0.0.1:8090 (sign in → portal → pick a child → board / text / voice)
```

## Resumability & honesty rules

- Every notebook cell marks a **done-flag** (`outputs/mX/.<cell>.done`) on success and skips on re-run — any crash just means "re-run the notebook".
- **Source-aware guards**: mock / pending runs never block a later real re-run; real runs do (force with `GEETA_EVAL_N` / `GEETA_OCR_N`).
- **No fake passes**: every output carries `model_source` / `ocr_source`; mock results are labelled pipeline tests, not performance.

## Research question

Can a small, purpose-built model measurably improve learning outcomes vs. not using one? Evidence plan: a small **n=2 pilot** (1 intervention + 1 control kid, pre/post), explicitly framed as a feasibility case study — no causal claims. Pilot starts only after HREC approval (see `docs/`).
