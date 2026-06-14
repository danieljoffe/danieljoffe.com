# WyrdFold case study — screenshot capture spec

For the WyrdFold case study (issue **#926**). This is the flagship full-stack +
AI artifact, so the screenshots carry real weight: the recruiter-persona UX
review's #1 finding was _"the AI/LLM claim has no on-site receipts"_ — a visitor
has to leave to wyrdfold.com to believe it. **The job of these screenshots is to
be that receipt.** Capture the LLM's visible _output_, not just chrome.

## The one principle

A recruiter reads "he shipped AI" when they can **see the model's output in a
real product UI** — a resume the LLM tailored, a match the LLM explained, a
cover letter it generated. Prioritize screens where the AI's work is on screen.
The plumbing receipts (prompt versioning, shadow runs, cost caps) are mostly
backend with no UI — I'll cover those in the case study as **code snippets + a
diagram + a cross-link to the "Operating LLM Pipelines" blog post**, so you
don't need to screenshot them. (If an `/admin/cost-summary` _view_ exists, grab
it — see #6 — otherwise I'll render that as a formatted JSON block.)

## What I need from you

Just the raw PNGs — drop them in a temp dir (e.g. `~/Downloads/wyrdfold/`) with
the suggested filenames. I'll optimize to webp, place them under
`apps/root/public/images/projects/`, and embed them in the MDX. The case-study
**cover** is separate (AI-generated via `pnpm gen:cover`), so it's not on this
list.

## Shot list (priority order)

### Must-have — the AI proof + core loop

1. **`wyrdfold-resume-tailoring`** — the resume-tailoring output (ideally
   before → after, or the tailored result with the target job visible).
   _Why:_ the flagship LLM output; the single strongest "he ships AI" receipt.

2. **`wyrdfold-match-rationale`** — a job's match/relevance score **with the
   reasoning** (the "why this scored 87" explanation, if the model generates
   one). A job-detail or expanded card.
   _Why:_ proves the matching engine + that the LLM produces judgment, not just
   a number.

3. **`wyrdfold-dashboard`** — the signed-in landing: the ingested job list with
   scores, filters, tabs.
   _Why:_ proves ingestion at scale + that this is a real, polished product, not
   a toy.

### Nice-to-have — depth & product surface

4. **`wyrdfold-cover-letter`** — a generated cover letter (if the feature
   exists). Another visible LLM output.

5. **`wyrdfold-onboarding`** — onboarding / target-role derivation (how a user
   sets what they're looking for). Shows product thinking + the "derive target"
   feature.

6. **`wyrdfold-cost-admin`** — ONLY if `/admin/cost-summary` (or any cost /
   observability) has a real UI showing today's spend + per-purpose breakdown.
   _Why:_ it's the literal LLM-ops receipt. If it's API-only, skip it — I'll
   show the JSON response in a code block instead.

## Capture tips

- **Desktop viewport, ~1440px wide** (matches the audit case study's
  screenshots). Wide framing reads better in the article than a phone shot.
- **Pick one theme and keep all shots consistent** — light is safest for
  legibility in a case study; dark is fine if the whole set matches.
- **Seed realistic but non-sensitive data.** Use a sample/fake résumé and
  clearly-generic target companies so nothing real needs heavy redaction.
- **Frame the whole feature**, not a cramped partial — but tight enough that the
  important content is legible at article width.
- Native PNG is fine; I downscale + convert to webp on my end.

## Redaction checklist (before you hand them over)

- [ ] No real third-party **company names** on scraped/ingested job postings
      (use sample data, or blur).
- [ ] No real **PII** — your home address/phone on the sample résumé, real
      recruiter emails, etc.
- [ ] No internal **identifiers** — raw UUIDs, internal user IDs, API keys,
      Supabase project refs, auth tokens in a visible URL bar.
- [ ] No unreleased/embarrassing **WIP** you don't want public (it's a public
      case study on a public site).

## After capture

Hand me the folder. I'll: optimize → `apps/root/public/images/projects/
wyrdfold-*.webp`, write the case study MDX (#926) with the screenshots + the
LLM-ops code/diagram receipts, register it (project.ts / contentOrder.ts /
content/projects/index.ts), bump the contentRegistry counts, and generate the
cover. Then the homepage Currently-building card can point at the case study
instead of the stopgap blog link.
