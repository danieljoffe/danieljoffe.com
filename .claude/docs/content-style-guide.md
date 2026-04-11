# Content Style Guide & Tone

Voice, structure, and tone rules for every content surface on danieljoffe.com: long-form (blog posts, project case studies, experience entries) **and** short-form (hero headlines, thumbnail titles and excerpts, CTAs).

## Who this guide serves

Any human or agent drafting content for the portfolio. Daniel is the sole author. The site's positioning is "senior frontend consultant with a decade of shipped work" — the voice is direct, evidence-backed, and never self-promotional. Every surface should sound like the same person talking.

## Brand voice pillars

1. **Direct.** Lead with the thing that matters. No preamble, no "In this post we'll explore."
2. **Evidence-backed.** Numbers, slugs, file paths, before/after. Claims get receipts.
3. **Calm confidence.** Never prove yourself. State what you built and why it worked.
4. **Builder's mindset.** Show the problem as it actually appeared, the decision as it was actually made, the trade-off as it was actually weighed.

## Voice: first-person singular ("I", "my")

Daniel works solo on the portfolio and as an individual consultant. All content uses **first-person singular**. Never "we" — even when describing a team the author was part of, prefer "the team" or name the collaborators explicitly.

```
BAD:  "We cut mobile load times from 10s to 2s."
GOOD: "I cut mobile load times from 10s to 2s."

BAD:  "Our Tooltip passed every test."
GOOD: "My Tooltip component passed every test."

BAD:  "We aligned five form components around one pattern."
GOOD: "I aligned five form components around one pattern."
```

**Exception:** When quoting someone else's words verbatim inside a blog post, preserve the original voice.

## Per-surface voice calibration

Different surfaces need different registers. The pillars stay constant, the tone tightens or loosens.

| Surface                | Register                   | Example                                                                                                                                                   |
| ---------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home hero headline     | Confident introduction     | "Senior frontend engineer shipping measurable outcomes."                                                                                                  |
| Home hero subtitle     | Personal depth             | "I've spent 10 years helping startups ship faster, building the frontends, design systems, and developer tooling that let teams move without friction."   |
| About page intro       | Personal depth             | "I build the systems that let teams move without waiting on me."                                                                                          |
| Services page          | Consultative clarity       | "I audit frontend performance and ship measurable fixes, not recommendations."                                                                            |
| Blog body (long-form)  | Practitioner peer          | "cmdk does substring matching. I replaced the filter engine with MiniSearch for ranked fuzzy results."                                                    |
| Project excerpt        | Past-tense outcome         | "Cut mobile load times from 10 seconds to 2 and dropped bounce rates by 39% at FightCamp."                                                                |
| Blog thumbnail title   | Specific, outcome-driven   | "Correlating a multi-step funnel with one sessionStorage ID"                                                                                              |
| Blog thumbnail excerpt | Lead with impact           | "A timestamp and random suffix in sessionStorage ties scan, completion, email capture, and calendar booking into one GA4 funnel with zero backend state." |
| CTA heading            | Project-focused invitation | "Have a performance problem? Let's talk."                                                                                                                 |

## Tense rules

- **Blog posts:** present tense. The technique is alive; the reader can apply it today. `"How I build a unified content pipeline"`, not `"built"`.
- **Project case studies:** past tense. The outcome already happened; the reader is reviewing the craft. `"Cut mobile load times from 10s to 2s at FightCamp"`.
- **Experience entries:** past tense outcomes, matching the project tense. `"Built the self-serve landing page CMS at Winc"`, not `"The Foundation Years"`.
- **Hero / about / services headings:** present tense. These describe who Daniel is, now. `"I build the systems..."`, not `"I built..."`.

## Length budgets

Short-form surfaces have hard character limits. Go over and the card or OG image will truncate.

| Surface           | Limit       |
| ----------------- | ----------- |
| Hero headline     | ≤ 60 chars  |
| Hero subtitle     | ≤ 180 chars |
| Thumbnail title   | ≤ 60 chars  |
| Thumbnail excerpt | ≤ 160 chars |
| CTA heading       | ≤ 50 chars  |

Blog body copy has no hard budget but aim for ≤ 800 words. Project case studies can go longer but stay tight.

## Punctuation

- **Periods, colons, and semicolons for clause breaks. Em dashes sparingly.** Em dashes create choppiness when overused. Reserve them for true parenthetical asides in long-form prose.
  - Period for independent clauses: "The negative assertion matters. It documents that the wrapper should not have the attribute."
  - Colon to introduce a consequence or list: "the actual interactive element: the `<button>`, `<a>`, or whatever the child is."
  - Semicolon to link related clauses: "A reasonable constraint; a tooltip without an interactive trigger element isn't useful."
  - NO: "The error itself is harmless — React recovers by re-rendering."
- **Em dashes are forbidden in short-form surfaces.** No em dashes in hero headlines, thumbnail titles, thumbnail excerpts, or CTAs. They eat character budget and add noise. Use a period, colon, or comma instead.
- **Commas for parenthetical asides in flowing prose.** "When the logo changes, and it will, I run one command."
- **Scare quotes for irony only.** Use them when a word means the opposite ("free" web tool, "invisible" sheet). Don't use them for technical terms.

## Anti-patterns

Don't use any of these. Ever.

- **Filler verbs:** spanning, leveraging, diving into, empowering, delighting, unlocking, unleashing, transforming
- **Marketing clichés:** world-class, cutting-edge, best-in-class, seamless, revolutionary, game-changing
- **Journey metaphors:** journey, path, adventure, story (unless literally about a story)
- **Vague authority:** "industry-leading," "enterprise-grade," "proven"
- **First-person plural for solo work:** no "we" when describing things Daniel did alone
- **Em dashes in thumbnails, hero headlines, or CTAs**
- **"In this post we'll explore..."** or any opener that previews instead of leading with the problem
- **Restating the post in the closing line.** The takeaway should add something, not summarize

## Long-form structure (blog + project case studies)

1. **The problem** — what was broken, wrong, or missing (1–2 paragraphs)
2. **The approach** — what the spec, platform, or pattern suggests (1–2 paragraphs + optional code)
3. **The implementation** — real code with prose explaining decisions (1–3 sections)
4. **The result** — what changed, what was gained (short list or paragraph)
5. **The takeaway** — one generalizable principle in active voice, first-person singular (1–2 sentences)

**Section economy:** Every section should advance the reader's understanding. If a code block already shows a detail (an attribute, a pattern), don't create a dedicated section to re-explain it. Fold it into a sentence near the code. Five tight sections beat seven with redundancy.

## Before/after: converting plural to singular

```
BEFORE (first-person plural, old guide):
"Why we removed a 15KB dependency from our shared-ui library and
 replaced it with native dialog behavior and manual focus management."

AFTER (first-person singular, new guide):
"Replacing a 15KB focus-trap dependency with native dialog behavior
 drops bundle size and simplifies the shared-ui library."
```

Note the second form also moved the verb into present tense, which matches the "blog = present" rule above.

## Self-check: short-form (thumbnails, heroes, CTAs)

Run this before shipping any change to a title, excerpt, headline, or CTA.

1. **Voice.** First-person singular if the author is speaking. Never "we" or "our" for solo work.
2. **Length.** Under budget for the surface (title ≤ 60, excerpt ≤ 160, headline ≤ 60, subtitle ≤ 180, CTA ≤ 50).
3. **Em dash audit.** Zero em dashes. Replace with period, colon, comma, or rewrite.
4. **Filler audit.** None of the anti-pattern words appear.
5. **Tense.** Blog = present, project/experience = past, hero/about/services = present.
6. **Specific, not generic.** The sentence names a technology, number, or outcome. "A component library" is weak; "A React component library adopted by 80% of apps" is specific.

## Self-check: long-form (blog posts, case studies)

Run this before finalizing any long-form draft.

1. **Em dash audit.** Em dashes in prose only for true parenthetical asides; otherwise replace with periods, colons, or semicolons.
2. **Consequence check.** Every "X happened" should have a "because Y" or "which meant Z."
3. **Takeaway voice.** The last line lands with a concrete, punchy principle. Not a restatement of the post.
4. **Redundancy check.** No section just re-explains what a code block already shows. Fold it or cut it.
5. **Full artifacts.** If the post is about a script or config, the complete version is included.
6. **Voice audit.** Zero "we" or "our" unless quoting someone else verbatim.
