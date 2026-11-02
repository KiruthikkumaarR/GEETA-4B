# GEETA 4B — Serving Configuration (authoritative)

Everything needed to run the model correctly: the system prompts, the sampling
profiles per call-type, and the launch command. Measured, not guessed — each
sampling choice below has an eval number behind it (see §5).

---

## 1. Launch

```bash
./third_party/llama.cpp/llama-server \
  --model models/geeta-4b/geeta-4b-q4_k_m.gguf \
  --mmproj models/geeta-4b/mmproj-geeta-4b-f16.gguf \
  --host 127.0.0.1 --port 8080 \
  -c 16384 -ngl 99
```

`--mmproj` is **required** for the vision/OCR path. `-ngl 99` = full Metal offload.

**Critical:** every request must send
`"chat_template_kwargs": {"enable_thinking": false}`.
Training used `enable_thinking=False` on every row. Leaving it unset makes the
Qwen3.5 template default to thinking ON, which is off-distribution for this
LoRA — the model burns the whole token budget inside `<think>` and returns an
**empty** `message.content`.

---

## 2. System prompts

### 2a. `TUTOR_SYSTEM` — the kid-facing tutor (`tools/tutor_data.ipynb`)

```
You are GEETA, a warm, gentle maths tutor for Australian children in Years 1 to 3 (ages 6-8).
Your rules, always:
1. The child works it out THEMSELVES. You guide; you never give the final answer — no matter how they ask, probe, or beg.
2. Ask for the child's first idea ONCE at the start. After that, just help — do not keep quizzing them or asking "is that right?".
3. Use the WHOLE conversation. Never repeat a hint you already gave. If the child gives a number from their working, react to THAT number: say what is right, then nudge the very next tiny step. Never restart the problem.
4. One idea per reply. No numbered lists, no "Step 1 / Step 2". Just the next little nudge.
5. Only ever state arithmetic you are sure of. If unsure, say "let's check this one together".
6. Keep replies short (under 50 words), kind, calm, and kid-level. Australian spelling and examples.
7. If the child goes quiet or gives up: gentle no-blame reset, a concrete anchor (fingers, groups of 10), a short story, a micro-win.
8. Celebrate the child's own working. Never say "the answer is ..." before the child says it.
```

### 2b. `WORK_SYSTEM` — internal verification only, **never shown to a child**

```
You are a precise arithmetic engine for an internal verification step. Your
output is NEVER shown to the child - it is checked by an independent verifier
before any reply is sent. Always respond with ONLY the requested JSON, no other
text, no refusals, no commentary.
```

> Why two prompts: reusing the kid-facing "never give the final answer" persona
> for the internal solve made the model treat *its own* working request as a
> leak probe and refuse to emit JSON (4/6 refusals when measured). Keep them separate.

### 2c. Private grounding block (injected per turn, never displayed)

When a verified plan exists, the tutor call also receives:

```
PRIVATE - the child must NEVER see this. The checked working is:
- <expression> = <result>  (<explanation>)
...
Use it to pick the ONE next small step to nudge them toward.
Never state the final answer or read these lines out.
```

---

## 3. Sampling profiles — **one profile does not fit all three call types**

| Call type | temperature | top_p | top_k | repeat_penalty | max_tokens |
|---|---|---|---|---|---|
| **Tutor chat** (kid-facing) | **0.5** | 0.9 | 40 | **1.1** | **120** |
| **OCR / vision** (transcription) | **0.1** | 0.85 | 20 | **1.0** | 512 |
| **Verify** (internal JSON solve) | **0.2** | 0.9 | — | **1.1** | 384 |
| *ModelClient baseline default* | 0.6 | 0.9 | 40 | 1.1 | 512 |

Also on every call: `"stream": false`, stop sequences `["User:", "System:"]`.

### Why these values (measured, not guessed)

- **`repeat_penalty = 1.1` on the verify path is load-bearing.** It looks wrong
  (that call emits JSON, where `"step"`/`"result"`/braces legitimately repeat)
  and I removed it on that reasoning — accuracy **dropped 88.76% → 85.14%**.
  This 4B model falls into degenerate repetition loops; the penalty breaks them.
- **Never use greedy (`temp 0.0`) on the verify path.** Measured **77.91%** —
  *worse than the untuned baseline*. At temp 0 every bounded retry produces an
  identical output, so the retry mechanism becomes worthless: one money skill
  went **0/10 with 4 identical failed attempts each**. Sampling variety is
  required for retries to do anything.
- **`repeat_penalty = 1.0` for OCR** — real worksheet pages legitimately repeat
  numbers and words; penalising that corrupts transcription.
- **`max_tokens = 120` for tutor chat** — replies must be under ~50 words. The
  512 default let it ramble.

---

## 4. Deterministic pre-solver (runs *before* the model)

`geeta.verifier.try_deterministic_solve()` solves exactly-parseable shapes in
Python first — money token sums, change-from-a-note, and bare arithmetic
expressions. Currently covers **54/249 (21.7%)** of the held-out set at
**54/54 correct, zero variance**.

It is deliberately conservative and returns `None` on anything ambiguous
(quantity words like "two 20c coins", word-form answers, sharing problems).
This is the brief's "the model proposes; Python disposes" contract, extended so
Python may also *propose* where it can be certain.

---

## 5. Measured results behind these settings

| Config | In-scope accuracy |
|---|---|
| Untuned baseline | 82.33% |
| **These settings** | **88.76%** |
| verify `repeat_penalty` 1.0 | 85.14% |
| verify greedy (`temp 0.0`) | 77.91% |

Held-out set = 249 synthetic ACARA Y1–3 problems.
**Run-to-run noise is ~±3.6pp** — do not read a single run as definitive.

Constant across all runs: **0 wrong answers delivered**, **0/36 adversarial
leaks**, OCR **99.3%** character accuracy on real kid handwriting.

---

## 6. Voice (browser TTS)

Scores `speechSynthesis.getVoices()` for a gentle female voice — on macOS it
selects **Karen (en-AU)**; falls back through Samantha / Moira / Tessa /
"Google UK English Female".

```
rate  = 0.88   # slow, gentle
pitch = 1.35   # lighter, younger
```

---

## 7. Known limitations

- Accuracy above is on **synthetic** problems. The real-worksheet held-out set
  (1,884 questions transcribed from 12 actual Year-2 worksheets) is not yet
  used for evaluation.
- The tutor still **occasionally restarts** a problem instead of continuing,
  despite the conversation history + verified-plan grounding.
- Eye-gaze attention tracking is implemented but **never validated against a
  real webcam**.
