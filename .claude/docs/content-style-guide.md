# Content Style Guide & Tone

Voice, structure, and tone rules for every content surface on danieljoffe.com: long-form (blog posts, project case studies, experience entries) **and** short-form (hero headlines, thumbnail titles and excerpts, CTAs).

## Who this guide serves

Any human or agent drafting content for the portfolio. Daniel is the sole author. The site's positioning is "senior frontend consultant with a decade of shipped work" — the voice is direct, evidence-backed, and never self-promotional. Every surface should sound like the same person talking.

## Brand voice pillars

1. **Direct, with a hook.** Lead with the line that earns attention, then place the reason, then give the context. Daniel's own rule, verbatim: "place the reason. explain in the next sentence. grab attention, give context." A flat, accurate sentence that lists service names is a failure even when it's correct. If the reader glazes before the period, rewrite it.
2. **Evidence-backed.** Numbers, slugs, file paths, before/after. Claims get receipts.
3. **Engaged and irreverent.** Dry humor, the occasional sarcastic aside, a willingness to mock his own past decisions ("I also wanted to include the kitchen sink!"). This is the opposite of buttoned-up, press-release "calm confidence." The writing has a pulse and a point of view.
4. **Builder's-eye honesty.** Narrate the work the way it actually happened, mess included: the bug a screenshot test caught, the feature that turned out half-baked, the detour. Name limitations plainly, without spin or drama.

## Voice fingerprint (the canonical anchor)

**This section is the single source of truth for "sounds like Daniel." When drafting, imitate the texture of the verbatim samples below — _not_ the polished register of existing posts. Most existing posts were AI-drafted and read generic; that drift is exactly what this guide exists to correct, so they are not a voice reference.**

Daniel's writing, in his own words:

> "My portfolio used a single global provider for state management and every single change, big and miniscule, triggered a re-render. Not only was I bundling the theme switch, the modal, window dimensions... I also wanted to include the kitchen sink!"

> "The hard part about shipping an LLM feature is not the prompt; it's everything else: the cost, the reproducibility, and what happens when it all fails while a user is actively using the tool."

> "I thought the resume generation was working fine, but a screenshot test revealed the bug... we realized the feature was half baked and needed more refinement. I had to pause what I was working on and immediately investigate, weigh the options, implement, then test the results."

### The habits to copy

- **Sentences flow; they don't chop.** Daniel connects clauses with conjunctions, semicolons, colons, and trailing "...". He runs related ideas together rather than breaking them into staccato fragments for punch. When he rewrote the flagship's "...not the prompt. It is everything around it:" he joined it with a semicolon: "...not the prompt; it's everything else:". Mirror that. Flow over chop.
- **Hook, then reason, then context.** Open with the line that earns attention, explain why in the next sentence, then fill in the detail. Never open with a flat inventory ("two FastAPI services running on Railway behind a Next.js frontend").
- **Plain words over writerly ones.** "while a user is actively using the tool," not "while a user is watching." Pick the literal phrase over the poetic one. No aphorisms, no "machinery," no "honest to name."
- **Dry humor and self-deprecation are welcome.** Idioms ("half-baked," "kitchen sink"), an occasional exclamation for comic timing, a wry jab at his own past code. Sarcasm in small doses.
- **Contractions always.** "it's," "there's," "I'd." The formal uncontracted register ("It is everything around it") reads as not-him.
- **Tell the real sequence.** Daniel narrates how the work unfolded, including when a feature landed late or a test caught something. The process is part of the story.

### Hard nos (Daniel telling you what he hates)

- **No rhetorical questions.** Daniel: "i think they're stupid and unnecessary." Cut "Sound familiar?", "Have a performance problem?", and every other question-as-rhetoric. State it.
- **No one-word / short-fragment emphasis.** Daniel finds it cliché ("It's. cliche"). Don't write "Failure is a row, not a log line." as clipped pieces. Keep the contrast if you want it, but say it as one flowing sentence.
- **No corporate / LinkedIn jargon.** "synergy" is a visceral no. So is the rest of the buzzword bin (see anti-patterns).
- **No service-name soup.** Don't string internal names ("audit-api," "job-api," "GlobalProvider") together without telling the reader what they are and why they should care, in the same breath.

### Calibration calls (Daniel's defaults — override on request)

- **Swearing.** Authentic to how Daniel talks ("I do swear"), but the site's audience is hiring managers during an FTE search. Default: keep literal profanity out of published posts; keep the irreverent _attitude_.
- **"We" vs "I".** Daniel naturally says "we" for what the system does ("we score thousands of jobs per target"). For credit and decisions, use "I" — he built it, he owns it. For system behavior, name the actor ("the pipeline grades every posting") rather than forcing "I" or drifting into team-implying "we."

## Voice: first-person singular ("I", "my")

Daniel works solo on the portfolio and as an individual consultant, so **credit and decisions are always first-person singular**: "I built," "I cut," "I decided." Never claim a team's work with "we," and never soften a solo decision into "we"; if a team was involved, name them or say "the team."

One real exception, because it's how Daniel actually talks: **system-voice "we"** for what the software does ("we score thousands of jobs per target") is fine. The line is credit versus behavior — "I" for what Daniel did, and for system behavior prefer naming the actor ("the pipeline grades every posting") over either an awkward "I" or a team-implying "we." See the Voice fingerprint's calibration note.

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
| CTA heading            | Project-focused invitation | "I fix frontend performance problems. Let's talk."                                                                                                        |

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

- **Favor flow over chop.** Daniel's sentences connect; they don't fragment for punch. Reach for semicolons, colons, and conjunctions ("and," "so," "but") to keep related ideas in one breath. Resist splitting a single thought into short independent sentences for emphasis; that staccato is the AI tell he dislikes most ("It's. cliche").
  - Semicolon to link related clauses: "The hard part isn't the prompt; it's everything else."
  - Colon to introduce a consequence or list: "everything else: the cost, the reproducibility, and what happens when it fails."
  - Use a period to end a thought, not to manufacture drama from a fragment. NO: "Failure is a row. Not a log line."
- **Em dashes: sparing in long-form, forbidden in short-form.** They add choppiness and eat character budget. Reserve them for a true parenthetical aside in body prose; never use them in hero headlines, thumbnail titles, excerpts, or CTAs. Daniel reaches for a semicolon or colon first. NO: "The error itself is harmless — React recovers by re-rendering."
- **Commas for parenthetical asides in flowing prose.** "When the logo changes, and it will, I run one command."
- **Scare quotes for irony only.** Use them when a word means the opposite ("free" web tool, "invisible" sheet). Don't use them for technical terms.

## Canonical Category & Tag Vocabulary

Every MDX entry's `category` field must be exactly one of the values below. New categories require a style guide update, not a silent drift — if the right bucket doesn't exist, pitch a new one in a PR against this file before using it in a draft.

### Categories

| Category                 | Applies to      | What belongs here                                                                                                                                                                                                                            |
| ------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Frontend Engineering`   | blog, projects  | User-facing behaviour: components, hooks, CSS, interaction patterns, state on the client. Not architecture, not accessibility.                                                                                                               |
| `Design Systems`         | blog, projects  | Tokens, typography, component library consistency, variant APIs, documentation for system users.                                                                                                                                             |
| `Accessibility`          | blog, projects  | ARIA, keyboard navigation, screen readers, focus management, WCAG. Even when the post is technically about a React component, if the point is a11y, it goes here.                                                                            |
| `Performance`            | blog, projects  | Load time, Core Web Vitals, bundle size, rendering cost, memoization, dependency weight. Both ship-improvements and measurement posts.                                                                                                       |
| `Full-Stack Development` | projects        | End-to-end features that span client + server: API routes, auth, form handling, server actions, persistence. Blog posts about server work are rare enough to fit under `Architecture` or `Tooling & CI`.                                     |
| `Tooling & CI`           | blog, projects  | Build tools, package managers, lint configs, GitHub Actions, deploy pipelines, monorepo tooling, error monitoring setup. Replaces the former `Developer Experience`, `Developer Tooling`, `DevOps`, `CI/CD`, and `Observability` categories. |
| `Architecture`           | blog, projects  | System design, module boundaries, composition patterns, state management shape, content pipelines, debugging that reveals a structural issue. Not component-level frontend work.                                                             |
| `Testing`                | blog, projects  | Unit, integration, visual regression, E2E. Testing philosophy and test-design posts.                                                                                                                                                         |
| `Career Experience`      | experience only | Every experience entry uses this category. Blog posts and projects should never.                                                                                                                                                             |

**Nine categories total.** Eight for blog + projects, plus `Career Experience` reserved for experience entries.

### Tags: the canonical vocabulary

**Every MDX entry's `tags` array must contain only values from the canonical list below.** New tags require a style guide update, not a silent drift. The same rule that governs categories applies here: if the right drill-down doesn't exist, pitch a new one in a PR against this file before using it in a draft.

**Rules:**

- **Cap:** at most **8 tags per entry, at least 3.** If an entry has more, cut the least-discriminating ones. If it has fewer, the content probably needs a tag from an adjacent facet.
- **No category duplicates:** if an entry's category is `Accessibility`, don't also tag it `Accessibility`. The category is the coarse bucket; tags should be narrower.
- **Canonical only.** Industry tags (Healthcare, HIPAA, Wine, Library Software, etc.) and vague concept tags (Refactoring, Design Patterns, Team Leadership, State Management, etc.) are intentionally excluded. Industry context belongs in body prose, not tag metadata. Vague concepts don't help discovery.
- **No marketing noise.** `SPA`, `Modern`, `Cutting-edge`, `Enterprise` and similar don't add discovery value.

**Canonical tag set (53 tags, organized by facet):**

| Facet                      | Tags                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Frameworks & libraries** | React, Next.js, Vue.js, Nuxt.js, Angular, AngularJS, Redux, GraphQL, Storybook, Express, MDX, GSAP |
| **Languages & runtimes**   | TypeScript, Node.js, Java, Bash                                                                    |
| **Styling**                | Tailwind CSS, Styled Components, CSS, HTML5                                                        |
| **Monorepo & build**       | Nx, pnpm, Monorepo, Webpack                                                                        |
| **Testing & CI**           | Jest, Playwright, E2E Testing, Visual Regression, CI/CD, GitHub Actions                            |
| **Observability**          | Sentry, Lighthouse                                                                                 |
| **Web APIs & standards**   | ARIA, WCAG, SSR, SSG, PWA, SVG                                                                     |
| **Cloud & services**       | Vercel, AWS Cognito, S3, CDN                                                                       |
| **Cross-reference tags**   | Accessibility, Performance, Design Systems, Component Library, Testing, Architecture               |
| **Specializations**        | Forms, Search, Security, Mobile, UX, REST APIs                                                     |

**Cross-reference tags** are category names that double as tags when a post isn't already in that category. Example: a `Frontend Engineering` blog post about keyboard navigation may legitimately tag `Accessibility`. The no-duplicates rule still applies — an entry already in category `Accessibility` must not also tag it.

**Canonical merges (applied automatically during normalization):**

| Canonical           | Merged from                        |
| ------------------- | ---------------------------------- |
| `Accessibility`     | `Accessibility (a11y)`, `a11y`     |
| `Performance`       | `Performance Optimization`, `Perf` |
| `Component Library` | `Component Libraries`              |
| `Mobile`            | `Mobile Optimization`, `Mobile UX` |
| `AWS Cognito`       | `Cognito`                          |
| `PWA`               | `PWAs`                             |
| `CSS`               | `CSS3`                             |
| `HTML5`             | `HTML`                             |
| `CI/CD`             | `CI`                               |

### The deprecated `topic` field

Earlier blog MDX files had a `topic?: string` field on `PostMetadata`. It was a second coarse label that duplicated `category` without any consumer reading it. **The field was removed in #336.** Do not add it back. Use `category` for the single bucket and `tags` for the drill-downs.

## Anti-patterns

Don't use any of these. Ever.

- **Filler verbs:** spanning, leveraging, diving into, empowering, delighting, unlocking, unleashing, transforming
- **Marketing clichés:** world-class, cutting-edge, best-in-class, seamless, revolutionary, game-changing
- **Corporate / LinkedIn jargon:** synergy, synergize, circle back, move the needle, low-hanging fruit, value-add, ideate. Daniel's words: "synergy, fucking hate that word."
- **Rhetorical questions:** "Sound familiar?", "Have a performance problem?" Daniel: "i think they're stupid and unnecessary." Make the statement instead.
- **Staccato fragments for emphasis:** "Failure is a row, not a log line." chopped into clipped pieces. It reads cliché ("It's. cliche"). Keep the contrast if you want it, but say it as one flowing sentence.
- **Writerly flourishes over plain words:** "while a user is watching," "honest to name," "the unglamorous machinery." Pick the literal phrase. Daniel rewrote "while a user is watching" as "while a user is actively using the tool."
- **Service-name soup:** naming internal services or symbols ("audit-api," "GlobalProvider") with no context or hook. Tell the reader what it is and why they should care, in the same breath.
- **Journey metaphors:** journey, path, adventure, story (unless literally about a story)
- **Vague authority:** "industry-leading," "enterprise-grade," "proven"
- **"We" that claims solo work as a team's:** no "we" for credit on things Daniel did alone. (System-voice "we" for what the software does is a separate, allowed case — see Voice fingerprint.)
- **Em dashes in thumbnails, hero headlines, or CTAs**
- **"In this post we'll explore..."** or any opener that previews instead of leading with the hook
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
7. **No rhetorical questions.** Zero. State it directly.
8. **Wince test.** Read it aloud. If it sounds like a LinkedIn post or a press release instead of Daniel talking, loosen it.

## Self-check: long-form (blog posts, case studies)

Run this before finalizing any long-form draft.

1. **Em dash audit.** Em dashes in prose only for true parenthetical asides; otherwise replace with periods, colons, or semicolons.
2. **Flow check.** No thoughts chopped into staccato fragments for fake punch. Join them with a semicolon, colon, or conjunction.
3. **Hook check.** The opening grabs attention and gives context, never a flat inventory of service names.
4. **Plain-word check.** No writerly flourish chosen for sound over clarity. Would Daniel say it that way to a dev friend?
5. **Consequence check.** Every "X happened" should have a "because Y" or "which meant Z."
6. **Takeaway voice.** The last line lands with a concrete principle that adds something, not a restatement of the post.
7. **Redundancy check.** No section just re-explains what a code block already shows. Fold it or cut it.
8. **Full artifacts.** If the post is about a script or config, the complete version is included.
9. **No rhetorical questions.** Zero.
10. **Voice audit.** "I" for credit and decisions; "we" only as system-voice for what the software does, never to claim solo work as a team's.
11. **Wince test.** Read it aloud. If a sentence sounds like a polished essay or a LinkedIn post instead of Daniel explaining the work, rewrite it.
