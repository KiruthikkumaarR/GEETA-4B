# GEETA — data management plan

**Version 1 — 13 October 2026.** Applies to the GEETA web app as deployed on the investigator's
computer and to the n=2 pilot. Companion to `docs/hrec_application.md` §5.

## 1. Inventory — every piece of data, where it lives, how long

| Data | Where | Who can see it | Protection | Kept for |
|---|---|---|---|---|
| Grown-up account: name, email, role | `data/portal/geeta_portal.db` (SQLite) | Admin; the person themself | File mode 600, folder 700, investigator's macOS account only | Until the account is removed / 30 days after study end [confirm] |
| Password | same DB | No one (argon2id hash only) | argon2id, per-password salt | as above |
| 2-step sign-in secret + recovery codes | same DB | No one (recovery codes hashed) | TOTP secret stored for code checking; recovery codes SHA-256 | until switched off |
| Sign-in tokens | same DB | No one (SHA-256 hashes) | HttpOnly, Secure, SameSite cookies; 14-day expiry; revoked on password change | 14 days |
| Child profile: first name/nickname, year level, picture, world theme, study code | same DB | Their parent, their linked tutor, admin | as DB | until deleted by parent/admin |
| Child secret number (PIN) | same DB | No one (argon2id hash) | throttled: 10 wrong tries / 15 min per child | until changed |
| Learning summary per session (skills, solved/tried, hints, slip categories, time, grade) | same DB | parent, linked tutor, admin | as DB | until deleted by parent/admin |
| Parent PDF reports | `outputs/portal/kid_<n>/parent/` | parent, linked tutor, admin (via the app) | folder 700; served only after sign-in + access check | until child deleted |
| Security log (sign-ins, failures, account changes, IP address) | same DB | admin | as DB; never contains passwords, codes, chats | 180 days (automatic) |
| Live tutoring session (chat turns, current question) | memory of the web app only | the signed-in user | never written to disk; dropped at session end or after 3 h idle | minutes–hours |
| Homework photo / PDF upload | temporary file | no one | re-encoded, OCR'd, deleted immediately | seconds |
| Camera (optional) | the child's browser only | no one | never transmitted or stored; only "engaged/away" label sent | not kept |
| Daily parent email + PDF (child's nickname, skills, solved/tried, slips, progress) | GEETA's sending mailbox (Gmail (Google)) + the parent's mailbox; PDF copy in `outputs/portal/kid_<n>/daily/` | the parent | TLS to the mail provider; only on days GEETA was used; parent can switch off | sent copy: per mailbox settings; local PDF until child deleted |
| Admin technical email + PDF (counts, service health, security-event counts) | sending mailbox + admin mailboxes; `outputs/portal/daily/` | admins | contains no names, answers or chats | per mailbox settings |
| Unsent emails (before sending is set up) | `outputs/email_outbox/` | investigator | folder 700, files 600 | delete after checking |
| Nightly backups of the DB | `data/portal/backups/` | investigator | mode 600, folder 700 | 30 most recent |
| De-identified research export | investigator's analysis folder | research team | study code only — no names, emails, IPs | per institution policy [state] |

Not collected at all: chat transcripts, photos, audio, video, location, school name, birth date,
surname, phone, address.

## 2. Transfers
- Daily report emails go through the configured mail provider (Google (Gmail)) — the PDF
  leaves the GEETA computer by email to the parent's address (APP 8 if the provider is overseas).
- AI processing is local (llama.cpp on the same computer) — no AI vendor receives child data.
- Optional remote access goes through a Cloudflare Tunnel (TLS). Cloudflare is a US company; data
  passes through its network in transit only (APP 8 cross-border disclosure — disclosed in the
  information sheet and privacy page). Local-network-only operation is possible if a family declines.

## 3. Security controls (tested 13 Oct 2026: 46/46 attacks blocked)
Sign-in on every page/API; argon2 passwords; optional TOTP 2-step (required for admin [investigator
to enable]); lock-outs per account / per child / per network address; cross-site request blocking;
Content-Security-Policy, HSTS, frame denial; only the app's own files served; 16 MB upload cap and
image re-encoding; rate limits; admin security log. Re-test with the attack suite after any change.

## 4. Deleting data
- Parent: Parent page → child → "Delete child's data" (type the name to confirm). Removes the
  profile, all learning summaries, all PDFs — immediately.
- Admin: same for any child; "Remove" an account (children stay, unlinked).
- Backups age out within 30 days; on a withdrawal request the investigator also removes the child
  from backups within 7 days [procedure: restore-filter-rewrite, or delete backups older than the
  deletion].

## 5. Backups and continuity
Nightly local backup at 02:30 (30 kept). [Investigator: keep an encrypted copy off the computer,
e.g. an encrypted external drive, and turn on FileVault.]

## 6. Data breach response (Notifiable Data Breaches scheme, Privacy Act 1988 Part IIIC)
1. **Contain** — stop the tunnel (`launchctl bootout gui/$(id -u)/com.geeta.tunnel`), change admin
   password, revoke sessions (password change signs everyone out of that account).
2. **Assess** within 30 days (sooner for children's data): what was accessed, whose, likely harm —
   use the admin security log and `logs/service_*.log`.
3. **Notify** affected parents and the OAIC if serious harm is likely; notify the HREC per its
   adverse-event rules.
4. **Review** — fix the cause, re-run the attack suite, document in `STATUS.md`.

## 7. Responsibilities
Data custodian: [investigator]. Technical maintainer: [name]. Review this plan at study start, at
any system change that touches stored data, and at study end.
