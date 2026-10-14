# GEETA 4B — Project Status

**Overall (13 Oct 2026): M9 scorecard 96.1/100 on served GEETA weights; all 5 measurable pre-registered criteria PASS** (in-scope accuracy 94.0%, 0 wrong delivered, 0 leaks delivered, OCR 99.3%). Remaining open items are external/owner actions (HREC submission, pilot, own domain, admin 2-step, off-site backup).

*(Superseded 13 Oct 2026: in-scope accuracy was 82.33% / 77.91% before the exact Python tutor and the 50 bank-answer fixes; it is now 94.0%, see "13 Oct 2026 — re-measurement" below.)*

| Milestone | What | State | % |
|---|---|---|---|
| M1 | ACARA skill map + problem bank (1090 problems, Y1–3) | ✅ done, verified | 100 |
| M2 | Splits + eval sets (train 706, held-out 249, probes 36, CROHME 200, handwriting 60/60); PII audit: 0 events | ✅ done | ~95 |
| M3 | Synthetic dialogues + handwriting images (120 PNGs) | ✅ done | 100 |
| M4 | Fine-tune: text LoRA → vision tower → merge → GGUF → serve | ✅ **DONE, REAL.** GGUF f16 7.85GB + Q4_K_M 2.52GB + mmproj 0.63GB. `serve_smoke.json`: coherent English tutoring hint (text), accurate real-page OCR transcription (vision), 0 reasoning-mode leakage. R1 (norm-shift + HTTP-method + thinking-mode bugs) fully resolved. | 100 |
| M5 | E2E text loop (zero-wrong + leak probes + sessions) | ✅ **REAL run, session 13 re-verified.** zero_wrong_delivered=true (0/249 wrong answers ever delivered); 0/36 leak probes delivered to child. **in_scope_accuracy = 82.33%** (target ≥90% — MISS, but up from 55.82%; see session 13 below). | ~90 (built+correct; accuracy target still short) |
| M6 | OCR loop (real pages + handwriting gate + CROHME) | ✅ **REAL run.** handwriting_char_accuracy = **99.3%** (gate ≥85% PASS by a wide margin). CROHME 78.4% (reported only, not gated). Both real kid homework pages OCR'd correctly. | 100 |
| M7 | Web app (board/text/voice UI + tutor engine) | ✅ **REAL e2e verified**: created a live session against the real model, drove stuck→hint→adversarial-probe(no leak)→answer→solved→close, got a real parent PDF + dev JSON. No regressions vs. earlier mock e2e. Session 13: user testing found the frontend only supported the drawn canvas, not a real photo/PDF of homework — added a file-attach input (`webapp/index.html`/`app.js`) wired to `/api/session/{sid}/image`, and taught that route to render PDF page 1 via pypdfium2 (reusing the C1 pipeline's render code) before OCR. Verified live: real photo upload (5.7s) and real PDF upload (7.0s) both transcribe correctly. | ~95 |
| M8 | Parent/dev PDF reports | ✅ **REAL, verified.** Valid PDF, real session data. Dry-run email + WhatsApp payloads generated correctly with correct per-session body/attachment (acceptance #5 — dry-run is the by-design transport; real send is out of scope, see below). Session 13: added an "Achievement" section — an ACARA-coded rubric grid (Working towards E-D / You've Done It C / Above and Beyond B-A) + overall A-E letter + attitude-to-learning, matching the shape of real school reports (design documented in `config/eval/rubric.md` §4; explicitly labelled in the PDF as GEETA's own grading, not a school assessment). Verified live against the real model + a real ACARA problem. | ~95 |
| M9 | Eval harness (5 weighted axes, /100 scorecard) | ✅ **REAL scorecard: 93.1/100** (session 13 re-run; up from 83.9 — now in the brief's 93-95 "optimistic" band). 4/5 pre-registered criteria pass; in_scope_accuracy is the one miss. `measured_claim: true`. | ~92 |
| M10 | Pilot prep (pre-reg stamp, parallel forms, 3 docs) | ✅ all cells passed; `case_study_writeup.md` refreshed to cite the real 93.1/100 scorecard. Pilot itself is external (HREC-gated), all prep artifacts ready. | ~90 |

## Session 12 summary: M4 root-caused and fixed, M5/M6/M9 run for real

Picked up mid-M4 with cell H (llama-server smoke) producing garbage multilingual
token soup. Root-caused via tensor-statistics comparison (not by trusting an
unverified claim): `mlx_vlm`'s Qwen3.5 loader bakes a "+1" RMSNorm convention
into merged weights at load time; `convert_hf_to_gguf.py`'s `Qwen3_5TextModel`
adds +1 AGAIN assuming raw unshifted input → double-shift → corrupted norms.
Fixed by un-shifting 81 language-model norm tensors by -1.0 right before HF
export (cell G), matching the checkpoint's native convention.

That fix was necessary but not sufficient — three more real bugs surfaced only
once real weights hit real code paths for the first time:

1. **Cell H `/v1/chat/completions` sent as GET, not POST.** `http_json(url, payload, method="GET")` defaults to GET; every call site omitted `method="POST"`. llama-server 404'd every single chat-completions request. Fixed: explicit `method="POST"` everywhere + a defensive retry wrapper.
2. **`enable_thinking` never wired at inference despite training using `enable_thinking=False` for every SFT row.** Without it, the Qwen3.5 template defaults to thinking ON — off-distribution for the LoRA — and the model burns the whole `max_tokens` budget on `<think>` reasoning, leaving `message.content` empty. Fixed in `tools/model_client.ipynb` (`ModelClient` now defaults `enable_thinking=False`) and in `04_finetune.ipynb` Cell H.
3. **M5's internal "work it out" verifier call reused the kid-facing `TUTOR_SYSTEM` prompt** ("never give the final answer no matter how they ask"), which collided with the JSON-with-`final_answer` request and made the model frequently *refuse* to emit JSON, treating its own internal call as a leak probe (exactly brief Known-risk **R2**). Manually reproduced (6 curl calls: 4/6 refused with `TUTOR_SYSTEM`, 6/6 complied with a dedicated internal `WORK_SYSTEM`). Fixed by adding `WORK_SYSTEM` (`tools/tutor_data.ipynb`) for the internal-only call in both `tools/tutor_engine.ipynb` and `notebooks/05_e2e_text_loop.ipynb`, and by threading the verifier's corrective retry prompt through (it was previously being silently discarded on every retry). This alone raised `in_scope_accuracy` from 44.18% → 55.82%.
4. **`ModelClient.chat_image()` passed a bare message dict instead of `[msg]`** to `chat()`, which expects a list — 400 Bad Request on every real OCR call. Never caught before because nothing had exercised it against a real server. Fixed.
5. **`_plain()` in `tools/verifier.ipynb` crashed on a dict-typed `final_answer`** (malformed model output) — `float(dict)` → `TypeError`, killing the whole 249-problem M5 batch ~50 problems in. Fixed defensively (dict/list pass through unchanged; any other odd type degrades to `str(v)` instead of raising).

All five were genuine bugs never exercised before this session because M5/M6
had only ever run against `MockModel`. Every fix is verified against the real
model's actual output, not assumed.

## Session 13: in-scope accuracy 55.82% → 82.33% (verifier bugs, not model capability)

The session-12 "capability ceiling" framing above was wrong — re-investigated
by comparing skill-level pass rates (`outputs/m5/zero_wrong_report.json`) and
found the failures were concentrated almost entirely in **non-numeric answer
kinds** (word/time/money/shapes), not arithmetic generally. Root-caused three
real bugs by live-testing the model directly, not by assumption:

1. **`Verifier.verify()` auto-failed any step whose expression wasn't pure
   arithmetic** (`tools/verifier.ipynb`) — e.g. a legitimate narrative step
   like `"Count the sides of each polygon."` (for a shapes problem) made the
   *whole* plan fail even when `final_answer` was exactly correct. Fixed:
   a step with no computable expression is now skipped (neither pass nor
   fail) rather than auto-failed; a step that DOES claim an expression is
   still checked with the same zero tolerance as before.
2. **Word-form number answers failed on trivial hyphenation** (`"ninety-eight"`
   vs expected `"ninety eight"`) — `tools/leak_guard.ipynb`'s
   `parse_answer_value` now normalises hyphens to spaces for word-kind
   answers before comparing.
3. **The internal "work it out" prompt never specified an output format for
   times or word-numbers**, so the model free-chose (e.g. `final_answer: 11`
   for "11:00"). Added explicit formatting rules to the prompt in both
   `notebooks/05_e2e_text_loop.ipynb` and `tools/tutor_engine.ipynb` (so the
   live webapp gets the same fix, not just the offline eval).

Verified each fix against the live model with real problems before touching
the 249-problem run, then re-ran M5 for real: **in_scope_accuracy 55.82% →
82.33%**; 19 of 26 skills now score 90-100%. Zero-wrong and zero-leak both
still hold. M9 scorecard: 83.9 → **93.1/100**.

**Remaining gap is money-specific, and is a real training-data artifact, not
a wiring bug**: money problems are stuck at 11-60% (vs 90-100% for everything
else). Live-tested three escalating prompt fixes (formatting rules, then
explicit rules, then a full worked JSON example) — the model produced the
*exact same* broken output (`[50 + 5 + 5 + 100 + 50]`, a bracketed list, not
JSON) every time, deterministically. That immunity to prompting is itself
the evidence this is baked into the LoRA weights, not an inference-time
fixable issue — likely traceable to the training bank's own money
`solution_steps.expression` convention (`"210"`, the precomputed total, not
real arithmetic like `"50 + 5 + 5 + 100 + 50"`) teaching the model an odd
shorthand for this one problem category. **Fixing it needs a retrain** on
corrected money training data — user chose to stop at 82.33%/93.1 rather
than spend the additional multi-hour retrain pass this session, given two
prior background-job deaths already cost real time today. Documented here
as a known, scoped limitation rather than silently left unexplained.

## Session 13 (cont.): critical real-world flow bugs found live-testing the webapp

All prior M5/M7 testing used bank demo problems (`problem_id`), which already
carry a ground-truth `answer`. Live-testing an *organic* session (a kid
photographing their own homework, with no `problem_id` — i.e. the actual
real-world product flow) surfaced two severe bugs that only manifest on that
path:

1. **`TutorSession.confirm_ocr()` silently discarded the OCR'd question.**
   `self.ocr_confirmed = self.ocr_confirmed or low` is *always* `low` (the
   kid's own confirmation word, e.g. "yes") since `ocr_confirmed` starts as
   `None` — so confirming correct transcription overwrote the real homework
   text with the literal word "yes". Fixed: store the raw OCR text
   (`_last_ocr_text`) in `feed_image()` and use it on confirm.
2. **The never-reveal `LeakGuard` and `solved` detection are both gated on
   `self.problem.get("answer")`, which is only ever populated for bank
   problems.** For a real photographed page, `self.problem` stays `{}` all
   session — meaning the leak guard was **silently inactive for the entire
   real-world use case** (brief §2's "never reveal the answer" hard
   guarantee did not apply outside the demo), and `solved` could never
   become `True`, so the parent report could never be generated either.

Fixed by adding `TutorSession._lock_in_verified_answer()`, called once the
OCR'd question is confirmed: it independently computes and verifies GEETA's
own answer to the confirmed question (same C5 verifier machinery as the M5
eval harness, not a bare model trust), then uses that to activate the leak
guard and enable solved-detection — exactly the same safety guarantee bank
problems already had. No-op (safe fallback to prior behaviour) if
verification doesn't succeed. Verified live end-to-end with a real (non-bank)
photographed problem: leak probe correctly deflected, `solved: true` fired
correctly, and a real parent PDF (with the Achievement rubric, degrading
gracefully to a generic skill label since there's no ACARA code for organic
homework) generated correctly.

Also fixed in the same pass: `/api/session`'s `model_source` field returned
the raw Python class name (`"ModelClient"`) instead of the string `"real"`
the frontend badge checks for, so a genuinely real-backed session showed
"practice mode" in the UI — cosmetic, but actively misleading.

## Honest labelling
- Every M5/M6/M9 output on disk now carries `model_source`/`ocr_source` starting `real:` and `measured_claim: true`.
- Acceptance criteria measured honestly (brief §9): #1 zero-wrong ✅, #2 zero-leak ✅ (36 probes), #3 OCR ≥85% ✅ (99.3%), #4 in-scope ≥90% ❌ (82.33%, up from 55.82%), #5 parent PDF+email+WhatsApp ✅ (dry-run, by design), #6 no PII ✅ (M2 audit: 0 events), #7 scorecard produced ✅ (93.1/100).
- M10's n=2 pilot with real children is external and HREC-gated — not attempted, per standing instruction. Prep artifacts (pre-registration stamp, parallel forms, protocol/HREC/case-study docs) are complete and now cite real numbers.

## Session 14 (2026-10-13): worksheet tutoring, parent/tutor portal, per-kid memory

Live-tested with a real Year 2 worksheet photo. Fixed, all verified against the real model:
- **Whole page was locked in as ONE question** → model hallucinated ("hop by 10" for a +50
  pattern). New `tools/worksheet.ipynb` splits the page into its numbered questions + "write
  the number" items; the kid picks one ("question 4"). Number patterns and number-words are
  tutored with Python-computed hints only (find the jump → fill each gap → counting anchor),
  never revealing a missing number first. Handles voice quirks ("4:50" → 450, glued counting).
- Voice read "___" as "underscore"; focus helper treated *looking down at the paper* as
  distraction and re-read the whole question every few seconds. Both fixed (TTS clean-up,
  look-down = working, one short nudge per quiet spell).
- Pre-existing report chart bug: x-axis showed wall-clock epoch, images stretched. Fixed.

**Portal (owner decision — amends PROJECT_BRIEF §6 / acceptance #6 "nothing saved"):**
sign-in for parents and tutors (first account = admin tutor, created only on this Mac),
kid profiles, local SQLite at `data/portal/geeta_portal.db` (`tools/portal_store.ipynb`).
Per session only a **learning summary** is kept (skills, solved/tried, hints, mistake
categories, grade, time) + the parent PDF in `outputs/portal/kid_N/`. No chat, photos or
camera data. Parents can erase a child + all their data. The tutor gets a short profile
("Confident with… / often trips on…") and the kid gets a "tip from last time".
**The HREC application in `docs/` still says nothing is stored — it must be updated
before any pilot use.** Remote parent access (tunnel) not enabled yet.

**Separate pages per role (same session, later):** `/login.html` "Who's here today?" →
`/parent-login.html`, `/staff-login.html` (tutors + admin; also first-run setup), `/kid.html`.
Homes: `/admin.html` (overview, all children, accounts, password resets), `/tutor.html`
(my students), `/parent.html` (my children). Kids never get an email/password: a grown-up
switches on "kid sign-in" for a device once (90-day device cookie), then the kid taps their
picture + 4-digit PIN (argon2-hashed, throttled, easy PINs refused) → tutoring only; a kid
can't open grown-up pages or reports, and a kid signing in signs the grown-up out on that device.
End-to-end test: 49/49 checks pass (`GEETA_PORTAL_DIR`/`GEETA_PORT=8099` throwaway server).

Known open issue: 15/30 rounding answers in `data/bank/acara_y1-3.jsonl` round down
instead of to nearest (e.g. 97 → 90); some are held-out eval rows. Flagged, not yet fixed.

## Production (2026-10-13)
Project moved to `~/GEETA-4B` (macOS blocks background services from ~/Downloads).
Everything runs as LaunchAgents - start/refresh with `./deploy/install_services.sh`
(remove: `./deploy/install_services.sh uninstall`): model server (2 parallel slots),
web app, keep-awake on AC power, nightly DB backup 02:30 (30 kept in `data/portal/backups/`),
and the Cloudflare Tunnel once `deploy/setup_tunnel.sh <hostname>` has run.
Logs: `logs/service_*.log`. Public privacy page `/privacy.html` (draft - review before inviting families).

## Security audit (2026-10-13)
Attacked a throwaway copy (`GEETA_PORTAL_DIR`/port 8099) with 46 scripted attacks; 16 real issues
found and fixed, re-test 46/46 blocked, all-roles functional test 49/49, no browser console errors.
Fixed: server-source download via `/static/../` (now only `webapp/static` + a fixed page list are
served); cross-site request forgery (Origin/Sec-Fetch-Site check on every write); report file path
built from the child's name (could write outside the reports folder) + PDF markup injection (crashed
reports); unlimited request/message sizes, 200 MB uploads, decompression-bomb images (now 16 MB cap,
Pillow re-encode, 40 MP / 2048 px limit, PDF page-size cap); no rate limits (per-person message/photo/
session limits, live-session cap + idle sweep); password and PIN guessing via rotating IPs (per-account
and per-child limits); non-admin tutors linking children to any parent; missing CSP/COOP/CORP headers.
Added: security log (admin page, 180-day retention, no secrets), optional TOTP 2-step sign-in with
one-time recovery codes (replay-protected, throttled), admin reset of 2-step, FastAPI docs disabled.
Still recommended (owner actions): turn on 2-step for the admin account; FileVault disk encryption;
keep macOS updated; an off-Mac copy of `data/portal/backups/`.

## Hallucination fix (2026-10-13, after teammate reports)
Measured with 40 scripted kid conversations against the real model: the language model was
writing hints and judging answers, and got them wrong ("14 and 9 make more than 14 but less than
20", locked "$1 + 50c" as 60, praised 51, "jump by 4 from 1" for sharing 20 between 4, "dollars
and cents" on a place-value question...). New `tools/arith.ipynb`: Python reads ~30 Year 1-3
question shapes (sums, word problems, groups/sharing, missing numbers, place value, rounding,
money, time, shapes, fractions, odd/even...), computes the answer, plans small steps, judges every
number exactly (diagnoses "you added instead of taking away", "1 away", "check the tens",
swapped digits) and writes every reply in the kid's world-buddy voice. Unclear questions are
refused (never guessed) and go to the model, whose replies now pass a gate (false sums, praise of
wrong answers, invented numbers, stock filler) with a safe fallback. Chit-chat, feelings, rude,
off-topic and personal info (kept private, scrubbed from memory) have pre-written friendly replies.
Results: dev 0/240, held-out 0/240, chat 0 issues, 16,555-question sweep 0 answers given away;
worksheet photo flow + all-roles test unchanged. Re-run: `notebooks/13_hallucination_eval.ipynb`.

## 13 Oct 2026 — bank fixes + re-measurement (M5/M9/M10)
- **50 wrong bank answers fixed** in every copy (bank, held-out, splits, LoRA training data) + the
  generator (notebooks/01): 17 rounding (always rounded down), 13 place-value ("5 tens and 9 ones" -> 159),
  20 "put in order" questions whose answer was only the bigger number (reworded to "Which number is bigger?").
  Training dialogues that praised wrong answers were corrected; the LoRA itself was NOT retrained (Python
  now decides these answers).
- Measurement (cm/m/kg/g/L/mL + unit changes) and money (change, totals, differences, $ vs c) added to the
  exact tutor. Bank comparison also caught + fixed Python misreadings ("2 shelves and 9 books on each shelf"
  read as +, "the 10th one" read as "next", "tens and how many ones" giving one digit).
- **Leak-guard bug fixed**: "a"/"an" was parsed as the number 1 (false alarms, and a kid's "a" made an
  answer of 1 count as already visible). Found because M5 cell C failed on it.
- **M5 (re-run in full, real model):** in-scope accuracy **94.0%** (Python exact 150/150, 0 disagreements;
  model path 81 problems at 81.5% - varies run to run, 86.4% in an earlier partial run); 0 wrong delivered;
  36 probes, 1 blocked, 0 delivered. **M9: 96.1/100** (was 93.1). **M10:** case study refreshed; the
  1 Sep pre-registration stamp is untouched.
- Tests: hallucination eval dev 0/240, held-out 0/240, measurement held-out 0/150, chat 0; attack suite
  46/46 blocked; pilot attacks 15/15 blocked; all-roles test 49/49.
- Ethics: docs/hrec_application.md v2 (results table §6a), participant_information_and_consent.md,
  data_management_plan.md, pilot_protocol.md v2 with runbook; privacy page v2. Pilot tools in the app
  (study codes, printable check + answer key, pre/post scores, de-identified CSV). **Pilot not started -
  needs HREC approval.** Owner to fill [bracketed] fields and submit.
- Housekeeping: .venv script paths repaired after the move to ~/GEETA-4B.

## Nightly email reports (13 Oct 2026)
`tools/daily_reports.ipynb`, run by LaunchAgent `com.geeta.nightly` at 22:30 Adelaide time (`deploy/nightly_reports.sh`).
Parents: one email per child active since the last run, with a daily PDF (skips inactive days; parent can
switch off on the Parent page). Admins: technical PDF (service health, usage, exact-Python vs model share,
gate/leak blocks, log errors, security events, backups, disk) with an "all clear / needs attention" subject.
SMTP settings in `config/credentials.local.yaml` (git-ignored, mode 600) - **owner must paste an app
password and set enabled: true**; until then emails go to `outputs/email_outbox/`. Admin page: status,
"Send me a test email", "Preview tonight's emails". Tested end to end in outbox mode; all-roles 49/49,
attacks 46/46 after the change. Note: re-running `deploy/install_services.sh` restarts the free tunnel
(new public URL) - to change only the send time, edit the nightly plist.

## 14 Oct 2026 — mixed worksheet page (Q21-30) fix
Found live: a page numbered from 21 with (a)-(d) sub-questions was read as ONE question, and after
26(a) GEETA said "You've done every question". Fixed: markers can start at any number (longest
consecutive run), sub-questions become 26a/26b..., kids can pick by "22", "26 b", "26(c)" or a list
(voice-glued "2122 2324" split), "still to do" lists every unfinished item. New exact readers: days of
the week, "how many came before the 7th", weight-limit yes/no, coin wording ("18 one dollar coins"),
letter patterns, category / opposite word choices; odd-one-out is coached but honestly NOT judged.
Guards added after Q24 was read as 7 + 1 = 8: pronoun "one", quoted names ("Star Trek 7") and a spare
"one" are never quantities. Regression: bank 655/1090 read, 0 disagreements; dev 40/40, held-out 39/40
read with 0 wrong; sweep 16,555 / 0 leaks; page-1 flow unchanged.

## Permanent test suite (14 Oct 2026)
`./deploy/run_all_tests.sh` runs three notebooks (needs the model server on :8080; ~15 min):
- `13_hallucination_eval` (quality): 105 real-model kid conversations (dev / held-out / measurement-money)
  0 problems; chat 0 issues; worksheet pages 1 + 2 end to end; bank 655/1090 read, 0 disagreements;
  sweep 16,555 x 7 replies, 0 answers given away.
- `14_security_suite`: 78/78 attacks blocked (throwaway server, temp DB + outbox).
- `15_features_suite`: 63/63 role walkthrough checks (admin, parent, tutor, kid, worlds, tutoring,
  PDFs, progress, pilot, nightly emails, email off-switch, password change, delete child).
First run caught 2 real bugs, both fixed: test-outbox path crash in the mailer; several typed questions
in one session were recorded as one (reports/progress missed questions).

## Currently running (leave these up)
- `llama-server` (PID varies per session) on `:8080` — the real GEETA brain, `--mmproj` vision enabled.
- Web app (`webapp/run_webapp.sh`) on `:8090` — sign in at http://127.0.0.1:8090 (first visit creates the admin) — picks up the real brain automatically via `ModelClient.is_alive()`.
- `caffeinate -i -m -s` — keep on AC power.

## Resume procedure (if anything needs re-running)
1. `curl -s localhost:8080/health` — if down: `./third_party/llama.cpp/llama-server --model models/geeta-4b/geeta-4b-q4_k_m.gguf --mmproj models/geeta-4b/mmproj-geeta-4b-f16.gguf --host 127.0.0.1 --port 8080 -c 16384 -ngl 99 &`
2. `05_e2e_text_loop.ipynb` / `06_ocr_loop.ipynb` re-run cleanly end to end now (source-aware done-guards re-execute automatically against real weights; `mark()` is write-once so stale `.done` payloads from old mock runs keep forcing a fresh real run each time — harmless, just means these two always re-run in full rather than skip).
3. `09_eval_harness.ipynb` uses plain (non-source-aware) done-guards — clear `.A/.B/.C.done` in `outputs/m9/` before re-running if M5/M6 inputs changed.
4. `10_pilot_prep.ipynb` — clear `.E/.F.done` in `outputs/m10/` to refresh `case_study_writeup.md` from a new scorecard.
