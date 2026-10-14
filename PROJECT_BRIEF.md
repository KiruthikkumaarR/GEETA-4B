# GEETA 4B — Project Brief (Execution Spec)

> **How to use this brief:** You are taking over execution of this project. All decisions in §2 are FINAL — do not re-litigate them. Execute the milestones in §8 in order. §9 is the definition of done. Where this brief and your instincts disagree, this brief wins unless it is factually wrong.

## 1. What we are building

**GEETA 4B**: a small (4B-parameter), purpose-built AI maths homework tutor for **Australian children in Grades 1–3 (ages ~6–8)**.

- Kid shows homework → GEETA reads their handwriting (OCR) → confirms the text with the kid → guides them step-by-step to work it out **themselves**.
- **Never reveals the actual homework answer.** **Never delivers a wrong calculation** (independent Python verification, zero tolerance).
- Input: pen on a web board (canvas → image), photo/scan of paper, text, or voice.
- After each session the parent gets an **auto PDF report** (email + WhatsApp): what was learned, time taken, confidence, engagement, with charts. A separate **dev report** tracks model speed/accuracy.

**Research question:** can a small, purpose-built model measurably improve learning outcomes vs. not using one?
**Evidence plan:** small pilot — **1 intervention kid + 1 control kid, pre/post comparison**, framed explicitly as a *small case study / feasibility study*, NOT a large trial. No causal claims.

**Environment:** Australia (Adelaide), team working in folder `GEETA - 4B`. Fine-tuning hardware: **Apple M4 Max, 48GB unified memory**.

## 2. Locked technical decisions (FINAL)

1. **Base model: Qwen3.5-4B** — the unified multimodal model (vision + text built in; this IS the "VL" model; Gated DeltaNet + Gated Attention hybrid, Apache 2.0, 262K context). ONE model does OCR + solving + tutoring. (Released Feb 2026; known benchmarks: MathVista-mini ~85, We-Math ~75, OCRBench ~88 on printed text.)
2. **Fine-tuning: MLX / mlx-lm + mlx-vlm, LoRA, on the M4 Max 48GB.** LoRA of a 4B uses ~10GB — fits easily. **Full weight fine-tune needs ~60–65GB and will NOT fit in 48GB — do not attempt it.** After LoRA, **merge the adapter into the base → standalone custom model "GEETA 4B" → export GGUF**. LoRA + merge = a fully custom model we own; that is the requirement, satisfied.
3. **Inference backend: llama.cpp** — `llama-server` + the `mtmd` vision module, OpenAI-compatible `/v1` endpoint, GGUF weights (~3.4GB at Q4, ~10GB at 8-bit). **MUST use the latest llama.cpp build** (Gated DeltaNet operators are new; old binaries won't run this model).
4. **Zero-tolerance correctness:** every arithmetic step the model emits is recomputed by an **independent Python engine** (sympy / fractions). Mismatch → regenerate that step (bounded retries, e.g. 3) → fallback "let's check this one together" path. The model proposes; Python disposes. This is the guarantee, not the model's judgment.
5. **Never reveal the answer:** (a) trained behaviour (hint-ladder data + refusal patterns), and (b) an **output guardrail** that parses the model's reply for the problem's final numeric answer and blocks/re-prompts if it appears.
6. **Privacy (hard constraints):** no recording, nothing saved, ever. Camera frames (Phase 2 only) processed **on-device in the browser**, never stored. Training JSON **anonymised** (no names, DOB, class IDs). Comply with Australian Privacy Principles (APPs) and the eSafety Code for children's online safety.
7. **Two-tool chain, clearly separated:** train in **MLX (PyTorch-MLX)** on the Mac → export **GGUF** → serve in **llama.cpp**. llama.cpp is the serving backend, NOT the trainer.
8. **Curriculum scope:** ACARA Mathematics Curriculum F–10 (v9.0), Years 1–3 content descriptions only. Year 1–2: place value to 100, 2-digit add/subtract, time, money, basic shapes. Year 3: × tables, intro division, fractions of a set. Do not build for out-of-scope content.

## 3. Product flow (every session)

1. Kid inputs homework: pen on canvas board, photo of paper, typed text, or spoken.
2. GEETA OCR transcribes → **shows the text to the kid to confirm/correct before proceeding** (human-in-the-loop OCR check — this rescues OCR errors).
3. GEETA asks the kid to **explain their own approach first**.
4. GEETA works the problem in the background, step by step; **every step passes the Python verifier**; only verified steps are used for hints.
5. Kid stuck → escalating hints, a **similar (different)** worked problem, story/scenario reframing, micro-wins + encouragement. **Never the answer to their problem.**
6. Kid goes quiet / disengages (inactivity signal now; on-device attention signal in Phase 2) → **re-engagement loop**: gentle no-blame reset → concrete anchor (fingers, drawing groups of 10) → change strategy (new story, simpler sub-step) → micro-win → continue.
7. Session ends → **parent PDF report** delivered by email + WhatsApp; **dev report** updated (tokens/s, TTFT, verifier pass rate, hint depth, retries, engagement proxy).

## 4. Components to build

**C1. PDF→JSON data pipeline (do this first).**
- Render each homework PDF page to PNG (@150–200 DPI, `pypdfium2`).
- Transcribe with a strong VLM as distillation teacher (Qwen3-VL-32B or an API model) into a strict schema per question:
  `{question_id, page, acara_skill, question_type (fill_in | word_problem | drawing | mcq), question_text (verbatim), diagram_description, child_answer_raw, marks_awarded, marks_total, teacher_comments, errors_flagged}`
- Pydantic-validate → JSONL per page + consolidated per child → **teacher review sheet** (spreadsheet or small web form) → anonymise.
- The teacher's marks/comments are implicit rubric signal — extract them into the rubric doc (see C9).

**C2. Training dataset (assemble all of the following):**
- **Marked homework** (C1 output) — core asset; includes question style, kid handwriting images, and grading signal.
- **CROHME** — handwritten maths expressions; the OCR/vision fine-tune backbone.
- **ACARA Years 1–3 problem bank** — built from content descriptions; target 50–150 problems per skill; the thing that makes GEETA Australian and on-level.
- **GSM8K (easy subset only)** — reasoning seasoning. It's grade 4–8; use the easier half, NOT the primary distribution.
- **Hint-ladder dialogues** — problem → kid attempt → hint 1 → hint 2 → kid solves. Generate with a frontier model, **teacher reviews every one**. This is the #1 data investment.
- **Teaching-voice + re-engagement behaviour block** — story/scenario teaching examples (e.g. regrouping as "a ones-pocket that only holds 10") and drift→recovery dialogues (the §3.6 loop). Spirit of TinyStories (small model, kid-level, coherent, engaging) implemented as **behaviour in the data, not by training on the TinyStories corpus**.
- **"Never reveal the answer" examples** — dialogues where the model withholds the final value + refusal patterns under probing.
- **Held-out eval set (NEVER in training):** 200–300 in-scope problems (split by skill), 50–100 real kid-handwriting samples, 30–50 pedagogy / engagement / adversarial-leak scenarios.
- Keep ≥75% of examples in reasoning style to preserve chain-of-work behaviour.

**C3. Fine-tune (MLX on M4 Max 48GB).**
- Base: `mlx-community/Qwen3.5-4B` (8-bit base is fine at 48GB).
- `mlx_lm.lora` (text/tutor behaviour) + `mlx-vlm` LoRA (vision/OCR) — or one combined run with distinct role prompts in the data.
- Config: LoRA ~16 layers, batch 1–2 + gradient accumulation, gradient checkpointing ON, LR ~1e-5, ~500–1000 iters, watch eval loss; run a small overfit check on 20 examples first.
- **Merge adapter into base → export GGUF** (verify the vision weights export correctly for this architecture — see R1).
- Optional: two adapters on the same GEETA base (`ocr`, `tutor`) swapped at serve time, to avoid "transcribe faithfully" vs "never reveal" interference.

**C4. Serving (llama.cpp).**
- Latest llama.cpp build (CUDA OFF / Metal or CUDA ON depending on box) → `llama-server` + `mtmd` → OpenAI-compatible `/v1`.
- Sampling per Qwen3.5 guidance: temp 0.7–1.0, top-p 0.95; thinking mode OFF for tutor responses (kids need short, fast answers).
- Latency budget: OCR transcription < ~5s/page; first tutor hint < ~5s.

**C5. Python verifier.**
- Model must emit structured JSON steps (`{step, expression, result, explanation}`); verifier recomputes `expression` with sympy/fractions and compares to `result`.
- Mismatch → bounded regeneration (3) → "let's check this one together" fallback. Log every verdict (feeds dev report + scorecard).

**C6. Answer-leak guardrail.**
- Compute the problem's final answer in the verifier; regex/parse the model's outgoing text for it (and obvious reformulations); block + re-prompt if found. Test adversarially (§9).

**C7. Web app.**
- Canvas board (pen strokes → PNG for OCR), text chat, voice in/out.
- Voice: Silero VAD → Whisper small/medium ASR (fine-tune delta on kid speech; evaluate on CHILDES + our own consented samples) → warm, slow-paced TTS (Piper or equivalent).

**C8. Reports.**
- Parent PDF (reportlab or HTML→PDF + matplotlib charts): what was learned (skills touched), time taken, confidence (verifier/hint-depth derived), engagement (session events; Phase 2 adds attention proxy). Delivered via email (SES/SMTP) + **WhatsApp Business API** (Meta/Twilio Cloud).
- Dev report: tokens/s, TTFT, verifier pass rate, hint depth per problem, retries, OCR corrections by kid, leak-guard triggers.

**C9. Grading rubric doc (still owed — build in M9).**
- Scoring rubric for pre/post tests + quality rubric for model hints (correct? age-appropriate? leaks answer? too many hints?) — seeded from the teacher marks extracted in C1.

**C10. Attention tracking (PHASE 2 — only after ethics approval).**
- MediaPipe Face Mesh / gaze estimation running entirely in-browser (WASM). Outputs an engagement proxy only. No frames leave the device, nothing stored.

## 5. Performance expectations (hypotheses to MEASURE, not promises)

| Axis | Expected (after fine-tune) |
|---|---|
| Delivered arithmetic correctness (verifier-enforced) | ~99/100 — the one axis we can guarantee |
| In-scope problem solving (Yr 1–3) | ~90/100 |
| Kid-handwriting OCR (raw) | ~85/100 — weakest axis; rescued by kid-confirm step |
| Pedagogy / engagement / never-reveal | ~90/100 — data-quality dependent |
| **Overall delivered experience** | **~88–92/100 expected; 82–85 conservative; 93–95 optimistic** |

## 6. Pilot design

- n=2: 1 intervention kid (uses GEETA), 1 control kid (business as usual).
- ~10-min ACARA-aligned diagnostic; build **parallel forms** for pre and post.
- 4–6 weeks, 2–3 sessions/week.
- **Pre-registered success criteria** (set before start): e.g. ≥X% post-test gain on the intervention kid; 0 wrong answers delivered; ≥Y% of hints rated correct on the rubric; 0 answer-leaks in 30+ adversarial prompts; parent reports delivered 100%.
- Write-up: small case study / feasibility. State n=2 and non-causal framing explicitly.

## 7. Compliance & ethics (current status)

- **Parental consent for the homework dataset: OBTAINED.**
- **HREC/ethics approval: REQUIRED before camera monitoring and before the pilot** (NHMRC National Statement). Strategy: file with the camera module as an optional Phase-2 add-on to shorten approval; pilot on board/voice/text meanwhile.
- Privacy: APPs + eSafety children's code; no recording/no storage; minimised session logs; anonymised training data.
- ACARA curriculum is public reference material; school worksheets used for internal R&D only.

## 8. Milestones (in order)

- **M1** — ACARA Years 1–3 skill map + problem bank (C2 part 1).
- **M2** — PDF→JSON pipeline (C1) + transcribe ALL homework PDFs + teacher review + anonymise.
- **M3** — Full training dataset assembly (C2) in MLX chat/vision JSONL; train/eval split locked.
- **M4** — Fine-tune GEETA 4B (C3) → merge → GGUF; smoke-test in llama.cpp.
- **M5** — Serving (C4) + Python verifier (C5) + leak guardrail (C6) → end-to-end text loop working.
- **M6** — OCR loop on real kid pages (C4 mtmd + C3 vision LoRA) → **measured OCR accuracy on held-out set**.
- **M7** — Web app: board + text + voice (C7).
- **M8** — Parent PDF + dev reports + email/WhatsApp delivery (C8).
- **M9** — Eval harness + grading rubric (C9) → **measured scorecard per axis + overall /100**.
- **M10** — Ethics approval (camera as Phase 2) → pilot pre/post → case-study write-up.

## 9. Acceptance criteria (definition of done)

1. **Zero wrong answers delivered** in any demo/pilot session (verifier-enforced; log as proof).
2. **Answer-leak test: 0 leaks** across ≥30 adversarial prompts (kid-style and clever probes).
3. **OCR character accuracy ≥85%** on the held-out real-kid-handwriting set (measured, reported).
4. **≥90% accuracy** on the held-out in-scope problem set (measured, reported).
5. Parent PDF arrives via email AND WhatsApp with all sections + charts, correct per-session data.
6. No PII in any training JSON; no session artefacts persisted beyond the parent/dev reports.
7. Scorecard (axis + overall /100) produced and attached to the pilot write-up.

## 10. Known risks

- **R1 (verify early):** llama.cpp + Qwen3.5 Gated-DeltaNet + `mtmd` vision path is new — pin latest build and test vision→GGUF→serve in M4, NOT at the end. Fallback: serve via MLX/LM Studio while the GGUF vision path is fixed.
- **R2:** "transcribe faithfully" vs "never reveal the answer" behaviour interference in one model → mitigate with role prompts in data; escalate to two LoRA adapters if it shows in eval.
- **R3:** OCR on messy real homework → kid-confirm step is the safety net; keep collecting consented kid samples.
- **R4:** small dataset → overfitting risk → held-out eval gate before any "it works" claim; keep ≥75% reasoning-style examples.
- **R5:** attention tracking is the highest ethics risk → Phase 2 only, never a blocker for the pilot.
