# HREC / Ethics Application — GEETA 4B feasibility case study

**Version 2 — 13 October 2026** (replaces the 1 September 2026 draft; see §10 for every change)
Prepared against the NHMRC *National Statement on Ethical Conduct in Human Research* (2023),
Chapter 4.2 (children and young people), the *Australian Code for the Responsible Conduct of
Research* and the Australian Privacy Principles (APPs).

> **Status: DRAFT for the investigator to complete and file. The pilot must not start until
> written HREC approval is received** (project brief §7). Fields in `[square brackets]` can only be
> completed by the investigator/institution.

| | |
|---|---|
| **Study title** | GEETA 4B — a privacy-preserving AI maths tutor for children in Years 1–3: an n=2 feasibility case study |
| **Principal investigator** | [name, role, institution, contact] |
| **Co-investigators / supervisor** | [names] |
| **HREC** | [committee name] — reference [number once assigned] |
| **Site** | [home / tutoring-centre setting, suburb, state] |
| **Funding / conflicts of interest** | [none / details] |

## 1. Plain-language summary
GEETA is a maths "buddy" app for children aged about 6–8. A child shows GEETA a homework question
(drawn, typed, spoken or photographed) and GEETA helps them work it out **themselves** — it gives
small hints and never gives the answer. We want to find out whether two families can use it
safely and comfortably for 4–6 weeks, and whether the child using it shows any change on a short
maths check before and after. This is a feasibility study with two children; it cannot show that
GEETA *causes* learning and we will not claim that.

## 2. Design
- n = 2 children (Years 1–3), each with a parent/guardian: one uses GEETA (intervention), one
  continues usual practice (control). 4–6 weeks, 2–3 sessions a week of about 20 minutes, with a
  parent nearby.
- Pre- and post-test: a 12-item parallel-form maths check (~10 minutes), answer key checked against
  Python-computed answers (§6). Same items pre and post (protocol §2).
- Pre-registered success criteria frozen 1 Sep 2026, SHA-256 `f9fa1887…` (`outputs/m10/pre_registration.json`).
  They have **not** been changed.

## 3. Participants, recruitment and consent
- Recruitment: [how families are approached — e.g. personal network / tutoring centre]. No payment
  [or: small thank-you gift of $__, not contingent on completion].
- Inclusion: child in Years 1–3, parent/guardian able to supervise sessions, home device with a
  modern browser. Exclusion: [any].
- **Parental consent** in writing before anything starts — `docs/participant_information_and_consent.md`
  (information sheet + consent form). Consent covers: participation; storing the learning
  summary described in §5; the parent report; OPTIONAL items ticked separately (camera focus
  helper; remote web access; use of de-identified results in a write-up).
- **Child assent** at the first session (read-aloud script in the same document) and a
  check-in at every session ("Do you want to do some maths with GEETA today?"). A child's "no" or
  signs of distress end the session without consequence.
- Withdrawal: any time, no reason needed. The parent can delete the child's profile, learning
  history and reports instantly from the Parent page ("Delete child's data"); the investigator
  confirms deletion of any research copy within 7 days.

## 4. What the system does (as built, 13 Oct 2026)
- Runs on **one computer controlled by the investigator** (a Mac computer in Adelaide, South Australia). The AI model
  (Qwen3.5-4B fine-tuned as "GEETA") runs locally; **no cloud AI service receives any child data**.
- Families use it in a web browser. For use away from the GEETA computer, an encrypted HTTPS
  connection is provided through Cloudflare's tunnel service (traffic passes through Cloudflare's
  network; Cloudflare does not store the learning data). Families may instead be offered
  local-network-only use [investigator to choose and state].
- Every grown-up signs in with their own email + password (2-step sign-in available and
  required for the administrator); a child signs in only on a device a parent has enabled,
  by tapping their picture and typing a 4-digit secret number. Children cannot see reports,
  other children or any grown-up pages.
- **Maths correctness:** for the common Year 1–3 question types, answers, hints and right/wrong
  decisions are computed by Python code, not by the AI model. Questions Python cannot read fall
  back to the AI, whose answer must pass an independent Python verifier and whose replies pass a
  checker that blocks false arithmetic, praise of wrong answers and invented numbers. An
  answer-leak guard checks every reply. See §6 for the measured results.

## 5. Data collected and how it is handled
Full inventory, retention and breach plan: `docs/data_management_plan.md`. In short:

| Kept (until deleted) | Never kept |
|---|---|
| Grown-up name, email, hashed password (argon2) | The chat between the child and GEETA (held in memory during a session only, then discarded) |
| Child **first name or nickname** (a study code is used for research outputs), year level, picture choice, hashed 4-digit secret number | Homework photos or drawings (read once, deleted within seconds) |
| Per session: skills practised, questions tried/solved, hints, kinds of slips, time, grade, the parent PDF report | Any camera image or video (the optional focus helper runs in the browser and sends only "focused"/"looking away") |
| Security log for grown-up accounts: sign-ins, failed attempts, account changes, with time and IP address — 180 days | Phone numbers / addresses a child types (GEETA tells the child to keep them private and removes them from memory) |

- Stored on the GEETA computer's disk in files readable only by the investigator's user account;
  nightly local backups (30 kept). [Investigator: confirm full-disk encryption (FileVault) is on and
  where an encrypted off-computer backup is kept.]
- **Research outputs are de-identified**: the export used for analysis contains a study code, year
  level, session counts, skills, scores — no names, emails or IP addresses.
- Retention after the study: [per institution policy — investigator to state, e.g. de-identified
  research data kept for the period required by the institution's research data policy for research
  involving minors; identifiable account data deleted within 30 days of study end unless the family
  chooses to keep using GEETA].

## 6. Risks and how they are reduced
| Risk | Likelihood / impact | Mitigation and evidence |
|---|---|---|
| Child shown wrong maths | Low / moderate | Python-computed tutoring for common question types; verifier + reply checker for the rest. Measured 13 Oct 2026: 0 problems in 630 scripted kid conversation turns across three test sets (one written after the system was built), 0 answers given away in a 16,555-question automated sweep; M5 held-out result in §6a. Stop rule: any wrong answer delivered in the pilot pauses the study. |
| Child is told the answer (no learning) | Low / low | Answer-leak guard on every reply; 36 adversarial "just tell me" probes: 0 leaks. |
| Child frustration or distress | Moderate / low | Kind, no-blame replies to "I hate maths", "too hard", "I can't"; parent nearby; child may stop any time; session length ~20 min. |
| Child shares personal information | Low / moderate | Detected (phone, address, email); child is told to keep it private; text removed from memory and never stored. |
| Inappropriate or off-topic content | Low / low | Off-topic questions are politely declined ("I'm a maths buddy"); rude messages get a calm reply; no web access, no other users visible. |
| Unauthorised access to accounts or data | Low / high | Independent attack test (46 scripted attacks, all blocked, 13 Oct 2026); argon2 passwords; 2-step sign-in; lock-outs on repeated wrong passwords/PINs; security headers; cross-site request blocking; admin security log. |
| Data loss or breach | Low / high | Learning summaries only (no chats/photos); local storage with restricted permissions; backups; breach response per the Notifiable Data Breaches scheme (`docs/data_management_plan.md` §6). |
| Camera misuse (optional Phase 2) | Low / moderate | Off by default; separate consent; runs in the browser only; no frame ever leaves the device or is stored. |
| Over-reliance / screen time | Low / low | Short sessions, parent-supervised, usual homework routine continues. |

### 6a. Measured system results to report to the committee
Re-run 13 Oct 2026 on the served model (`outputs/m5/m5_summary.json`, `outputs/m9/scorecard.json`):

| Pre-registered criterion | Required | Measured | |
|---|---|---|---|
| Wrong answers delivered (249 held-out problems) | 0 | 0 | PASS |
| In-scope accuracy (249 held-out problems) | ≥ 90% | 94.0% | PASS |
| Answers leaked to the child (36 adversarial probes) | 0 | 0 (1 attempt blocked by the guard) | PASS |
| Handwriting OCR character accuracy | ≥ 85% | 99.3% | PASS |
| Overall scorecard | ≥ 82 / 100 | 96.1 / 100 | PASS |

Not yet measurable before the pilot: parent-report delivery by email/WhatsApp (dry-run only) and the
intervention child's ≥ 10-point gain.

## 7. Benefits
Patient, always-available maths practice that makes the child do the thinking; a progress report
for parents; data stays with the family/investigator rather than a commercial platform. The
control child continues usual practice and is offered GEETA after the study.

## 8. Analysis and reporting
Primary: intervention child's change on the 12-item check (percentage points) against the
pre-registered threshold; control child described. Secondary: system reliability metrics. Framed
as feasibility and within-child change only; no causal or generalisable claims (n = 2).

## 9. Camera module (optional Phase 2)
Unchanged from v1: MediaPipe face landmarks in the browser (WebAssembly); outputs only an
engagement label; nothing stored or transmitted; separately consented; may be declined without
affecting participation. Looking down at paper is treated as working, not distraction.

## 10. Changes since the 1 September 2026 draft
| Area | v1 said | v2 (now) | Why |
|---|---|---|---|
| Storage | "Nothing saved; session state in memory only" | Learning summary + parent PDF + account data + security log are kept (§5); chats, photos, camera never kept | Owner decision to give parents/tutors a progress history and to let GEETA remember what a child has learned |
| Access | Family's own machine only | Investigator's computer, reached by browser; optional encrypted remote access via Cloudflare tunnel | Parents asked to view progress from anywhere |
| Accounts | None | Parent / tutor / admin sign-in, child picture + PIN on enabled devices, 2-step sign-in | Needed once data is stored |
| Maths safety | Model + verifier | Python computes common question types; model only for the rest, gated | Teammate testing found model-written hints were sometimes wrong |
| Answer key | Bank answers | 50 bank answers corrected (rounding, place value, ordering); generator fixed | Found during the 13 Oct audit; pilot forms re-checked |

---
*Maintained by hand from v2 onward (`notebooks/10_pilot_prep.ipynb` will not overwrite it).*
