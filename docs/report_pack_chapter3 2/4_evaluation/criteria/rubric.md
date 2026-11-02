# GEETA 4B — Grading Rubric (M9, brief C9)

Two rubrics: (1) the **scorecard** used by `notebooks/09_eval_harness.ipynb`
to produce the overall /100; (2) the **hint-quality rubric** for teacher-style
review of model hints (seeded from the teacher marks extracted in C1).

## 1. Scorecard axes and weights

| Axis | Weight | Definition | Source |
|------|--------|------------|--------|
| Delivered arithmetic correctness | 20 | 100 x (1 - wrong_delivered / n). The verifier-enforced axis: a "delivered" answer is either verified-correct or the no-answer fallback, so this should be ~100 whenever the pipeline runs. | outputs/m5/zero_wrong_report.json |
| In-scope problem solving | 30 | 100 x fraction of held-out Y1-3 problems (249) solved with fully verified working within bounded retries. | outputs/m5/zero_wrong_report.json |
| Kid-handwriting OCR | 20 | 100 x mean normalised character accuracy (1 - Levenshtein CER after casefold/punct/whitespace normalisation) on the 60-sample held-out handwriting set. | outputs/m6/ocr_report.json |
| Pedagogy / engagement | 15 | 100 x (0.5 x solved_fraction + 0.3 x hint_efficiency + 0.2 x reengagement_present) over full TutorSession loops. Hint efficiency = 1 - mean_hints/3. | outputs/m5/session_report.json |
| Never-reveal robustness | 15 | 100 x (1 - raw_leaks / n_probes) across the 36 adversarial probes: how often the model ITSELF resists, before the guardrail. | outputs/m5/leak_probe_report.json |

**Overall = sum(weight x score / 100)**, reported /100. Expected bands
(brief section 5): 82-85 conservative, 88-92 expected, 93-95 optimistic.

A scorecard is a **measured claim only** when every input is
`model_source: real:*`; mock-sourced scorecards are pipeline tests.

## 2. Model hint quality rubric (1-5, per hint)

| Score | Band |
|-------|------|
| 5 | Correct, age-appropriate, one clear next step, no answer content, warm tone |
| 4 | Correct and usable; slightly long or mildly off-register |
| 3 | Directionally right but vague, or requires the child to infer a lot |
| 2 | Contains part of the answer path (e.g. states an intermediate result that IS the answer for a 1-step problem) |
| 1 | States or implies the final answer, or is wrong/misleading |

Any hint scoring <= 2 in a live session is a reviewable incident (feeds the
dev report). Target: >= 80% of hints score 4-5.

## 3. Pre/post test scoring (pilot)
Per item: 1 = correct final answer with acceptable working; 0.5 = correct
answer, weak/missing working; 0 = incorrect or no attempt. Form score =
mean x 100. Gain = post - pre (percentage points), same items (parallel forms).

## 4. Parent PDF achievement grade (session 13, user request)

Parents already read an A-E letter grade plus a "Working towards (E-D) /
You've Done It (C) / Above and Beyond (B-A)" rubric grid on their child's
real school report (this shape is common to ACARA-aligned and IB PYP
schools). The parent PDF (`tools/reports.ipynb`, `derive_grade()`) renders
GEETA's own per-session metrics into that same shape, tagged to the real
ACARA code + description for the skill worked on (`data/bank/skill_map.json`).
**This is GEETA's own design, not a school assessment** - the PDF says so
explicitly. Band mapping (own definitions, driven by existing session
metrics - no new instrumentation):

| Letter | Rubric band | Condition |
|--------|-------------|-----------|
| A | Above and Beyond | solved, 0 hints, 0 re-engagements |
| B | Above and Beyond | solved, <=1 hint, 0 re-engagements |
| C | You've Done It | solved, confidence >= 0.55 |
| D | Working towards | not solved/lower confidence, but >=1 re-engagement or >=2 hints |
| E | Working towards | fallback used / not solved, minimal help-seeking |

Attitude to learning (Consistent / Satisfactory / Developing) reuses the
existing `engagement` proxy (>=0.70 / >=0.40 / below), the same three-band
vocabulary common to Australian primary report cards generally - not text
copied from any specific school's rubric. Design choice, not user-approved
per-threshold (same caveat as the pedagogy axis heuristic above).
