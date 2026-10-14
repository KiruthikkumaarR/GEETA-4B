# GEETA 4B — Pilot Protocol (n=2 small case study / feasibility)

**Version 2 — 13 October 2026** (data handling updated to match `docs/hrec_application.md` v2; runbook added in §7).

**Status:** DRAFT for HREC filing. **Hard gate: the pilot starts only after
HREC approval** (brief section 7). This is a feasibility case study, NOT a
randomised trial; **no causal claims** are made (brief section 6).

## 1. Design
- n = 2 children (Years 1-3, ACARA in-scope maths): 1 intervention (uses GEETA),
  1 control (business as usual).
- Duration: 4-6 weeks, 2-3 sessions/week (~20 min each).
- Phase 1 inputs: **board (drawn) / text / voice only**. Camera attention
  tracking is an OPTIONAL Phase-2 add-on, on-device only, never a blocker.

## 2. Instruments
- Pre/post diagnostic: parallel forms (~10 min, 12 items each, stratified by
  year/strand/difficulty). Forms: `data/eval/pilot_forms/` (manifest: seed 20260901,
  items/form_a=6, items/form_b=6). Post uses the SAME items as pre
  (parallel-forms design) so gain is measured on identical content.
- Session data: the chat stays in memory only and is discarded; what is kept is the per-session
  learning summary (skills, solved/tried, hints, slip categories, time) + parent PDF, under the
  child's profile (see `docs/data_management_plan.md`). Research analysis uses the de-identified
  export (study code only).
- 13 Oct 2026: the pilot forms were re-checked against Python-computed answers; one item
  ("Put 671 and 970 in order, smallest first.", answer key said 970) was reworded to
  "Which number is bigger: 671 or 970?" so the question matches its key. No child had sat the forms.

## 3. Procedure (per session)
1. Kid inputs homework via board/text/voice.
2. GEETA confirms OCR text with the kid (human-in-the-loop).
3. GEETA asks for the kid's own approach first; hint ladder (max 3) ->
   similar worked example -> story reframe. NEVER the final answer.
4. Common Year 1-3 question types are tutored by Python (answers, hints and right/wrong computed,
   never guessed); anything else uses the model, whose answer passes the independent Python
   verifier (C5) and whose replies pass the hallucination gate. Every reply passes the
   answer-leak guardrail (C6).
5. Session end -> parent PDF + dev report.

## 4. Pre-registered success criteria (frozen 2026-09-01T22:36:05+0930, sha256 f9fa188701f3b27b)
  - zero_wrong_delivered: {"max": 0, "scope": "any demo/pilot session; verifier-enforced, logged as proof"}
  - in_scope_accuracy: {"min": 0.9, "set": "data/eval/heldout_problems.jsonl (249 held-out Y1-3 problems)"}
  - leak_probes: {"max_leaks_delivered": 0, "min_probes": 30, "set": "data/eval/adversarial_probes.jsonl (36 kid-style + clever probes)"}
  - ocr_char_accuracy: {"min": 0.85, "set": "data/eval handwriting eval split (60 held-out samples)"}
  - parent_reports_delivered: {"min": 1.0, "scope": "email AND WhatsApp dry-run paths, all sections + charts present"}
  - pii_in_training_json: {"max": 0, "scope": "all training JSONL (M2 scrubber + audit)"}
  - scorecard_overall: {"min": 82, "scope": "M9 weighted /100 scorecard, real model source only"}
  - pilot_intervention_gain_pp: {"min": 10, "scope": "intervention kid post-test minus pre-test on parallel forms (percentage points)"}

## 5. Safety & stopping rules
- Zero-tolerance verifier + leak guardrail run on EVERY reply (config).
- Stop and debrief if: a wrong answer is ever delivered, a leak reaches the
  child, or a child/parent reports distress. Parent may withdraw at any time.

## 6. Analysis
- Primary: intervention kid's post-test gain on the parallel form (percentage
  points) vs pre-registered threshold; control kid reported descriptively.
- Secondary: verifier pass rate, hint depth, OCR corrections, engagement
  events, parent-report delivery rate — all from the M9 scorecard + session logs.
- Framing: feasibility + within-kid change; explicitly non-causal (n=2).

## 7. Runbook — running the pilot in GEETA (only after written HREC approval)
**Before the first session (investigator / admin)**
1. Sign in as admin → turn ON 2-step sign-in. Confirm FileVault is on and an encrypted off-computer
   backup exists (`docs/data_management_plan.md` §5).
2. Collect signed consent (`docs/participant_information_and_consent.md`). Only then: Admin page →
   add each parent account, add each child (first name or nickname), link parent + tutor.
3. Child's Progress panel → **Pilot study**: set the study code (P01 = intervention, P02 = control).
4. Print the check (**Printable check** button). Give it to BOTH children (~10 min, no help), mark
   with the answer key, enter **Pre-test** scores.
5. Intervention family: parent sets the child's picture + secret number and presses **Let kids sign
   in on this device** on the child's device. Read the assent script; record the answer.

**Each session (intervention child)**
6. Ask "Do you want to do some maths with GEETA today?" — stop if no. ~20 minutes, parent nearby.
7. Child signs in (picture + number), chooses their world, does homework with GEETA, presses
   **I'm done** / **Bye** at the end (the summary and parent report are saved automatically).

**Weekly checks (investigator)**
8. Admin page → Security log: look for failed sign-ins / blocked requests.
9. Read the child's Progress page and reports; note anything odd.
10. Any wrong maths shown, an answer leaked, or distress → **stop rule** (§5): pause, debrief, report
    to the HREC as required.

**End of study**
11. Give the same check again to both children; enter **Post-test** scores (the panel shows the
    change in percentage points vs the pre-registered +10 goal).
12. Admin → **Download de-identified data** (CSV, study codes only) → analysis + case study write-up.
13. Ask each family whether to keep or delete their data; delete accounts not being kept within 30
    days (`docs/data_management_plan.md` §4).
