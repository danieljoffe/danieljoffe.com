# Content Style Guide & Tone

Voice, structure, and tone rules for every content surface on danieljoffe.com: long-form (blog posts, project case studies, experience entries) **and** short-form (hero headlines, thumbnail titles and excerpts, CTAs). Daniel is the sole author; the positioning is "senior frontend consultant with a decade of shipped work." Every surface should sound like the same person talking.

## Brand voice pillars

1. **Direct, with a hook.** Daniel's rule, verbatim: "place the reason. explain in the next sentence. grab attention, give context." A flat, accurate sentence that lists service names is a failure even when it's correct.
2. **Evidence-backed.** Numbers, slugs, file paths, before/after. Claims get receipts.
3. **Engaged and irreverent.** Dry humor, the occasional sarcastic aside, a willingness to mock his own past decisions. The opposite of buttoned-up, press-release "calm confidence."
4. **Builder's-eye honesty.** Narrate the work the way it actually happened, mess included; name limitations plainly, without spin or drama.

## Voice fingerprint (the canonical anchor)

**This section is the single source of truth for "sounds like Daniel." Imitate the texture of the verbatim samples below — _not_ the polished register of existing posts. Most existing posts were AI-drafted and read generic; that drift is exactly what this guide corrects, so they are not a voice reference.**

> "My portfolio used a single global provider for state management and every single change, big and miniscule, triggered a re-render. Not only was I bundling the theme switch, the modal, window dimensions... I also wanted to include the kitchen sink!"

> "The hard part about shipping an LLM feature is not the prompt; it's everything else: the cost, the reproducibility, and what happens when it all fails while a user is actively using the tool."

> "I thought the resume generation was working fine, but a screenshot test revealed the bug... we realized the feature was half baked and needed more refinement. I had to pause what I was working on and immediately investigate, weigh the options, implement, then test the results."

### The habits to copy

- **Sentences flow; they don't chop.** Connect clauses with conjunctions, semicolons, colons, and trailing "...". Never break related ideas into staccato fragments for punch — that's the AI tell Daniel dislikes most ("It's. cliche").
- **Hook, then reason, then context.** Never open with a flat inventory ("two FastAPI services running on Railway behind a Next.js frontend").
- **Plain words over writerly ones.** "while a user is actively using the tool," not "while a user is watching." No aphorisms, no "machinery," no "honest to name."
- **Dry humor and self-deprecation.** Idioms ("half-baked," "kitchen sink"), an occasional exclamation for comic timing, a wry jab at his own past code.
- **Contractions always.** "it's," "there's," "I'd." The uncontracted register ("It is everything around it") reads as not-him.
- **Tell the real sequence.** Include the feature that landed late, the bug the test caught, the detour. The process is part of the story.

### Hard nos

- **Rhetorical questions** ("Sound familiar?"). Daniel: "i think they're stupid and unnecessary." State it instead.
- **One-word / short-fragment emphasis.** Keep the contrast if you want it, but say it as one flowing sentence.
- **Corporate / LinkedIn jargon.** "synergy, fucking hate that word."
- **Service-name soup.** Never string internal names ("audit-api," "GlobalProvider") without saying what they are and why the reader should care, in the same breath.

### Calibration (Daniel's defaults — override on request)

- **Swearing:** authentic to how Daniel talks, but the audience is hiring managers during an FTE search — keep literal profanity out of published posts; keep the irreverent attitude.
- **"I" vs "we":** **"I" for credit and decisions, always** — Daniel works solo; never claim solo work as a team's or soften a solo decision into "we." System-voice "we" for what the software does ("we score thousands of jobs per target") is fine; for system behavior, prefer naming the actor ("the pipeline grades every posting"). Verbatim quotes keep their original voice.

```
BAD:  "We cut mobile load times from 10s to 2s."
GOOD: "I cut mobile load times from 10s to 2s."
```

## Per-surface calibration

The pillars stay constant; the register tightens or loosens by surface.

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

## Tense

- **Blog posts:** present — the technique is alive. "How I build a unified content pipeline," not "built."
- **Projects & experience entries:** past — the outcome already happened. "Cut mobile load times from 10s to 2s at FightCamp."
- **Hero / about / services:** present — who Daniel is, now.

## Length budgets

Hard character limits; over budget, the card or OG image truncates.

| Surface           | Limit       |
| ----------------- | ----------- |
| Hero headline     | ≤ 60 chars  |
| Hero subtitle     | ≤ 180 chars |
| Thumbnail title   | ≤ 60 chars  |
| Thumbnail excerpt | ≤ 160 chars |
| CTA heading       | ≤ 50 chars  |

Blog body has no hard budget but aim for ≤ 800 words; case studies can run longer but stay tight.

## Punctuation

- **Flow over chop** (see fingerprint): semicolon to link related clauses ("The hard part isn't the prompt; it's everything else"), colon to introduce a consequence or list, commas for asides in flowing prose ("When the logo changes, and it will, I run one command"). Periods end thoughts; they don't manufacture drama from fragments.
- **Em dashes: sparing in long-form, forbidden in short-form.** They add chop and eat character budget. Reserve for a true parenthetical aside in body prose; Daniel reaches for a semicolon or colon first.
- **Scare quotes for irony only** ("free" web tool, "invisible" sheet) — never for technical terms.

## Categories & tags

Every MDX entry's `category` must be exactly one of the values below. New categories or tags require a PR against this file first — never silent drift.

| Category                 | Applies to      | What belongs here                                                                                                                                       |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Frontend Engineering`   | blog, projects  | User-facing behaviour: components, hooks, CSS, interaction patterns, client state. Not architecture, not accessibility.                                 |
| `Design Systems`         | blog, projects  | Tokens, typography, component-library consistency, variant APIs, docs for system users.                                                                 |
| `Accessibility`          | blog, projects  | ARIA, keyboard nav, screen readers, focus management, WCAG — even when the vehicle is a React component.                                                |
| `Performance`            | blog, projects  | Load time, Core Web Vitals, bundle size, rendering cost, memoization, dependency weight. Improvements and measurement posts.                            |
| `Full-Stack Development` | projects        | End-to-end client+server features: API routes, auth, forms, server actions, persistence. (Server-side blog posts fit `Architecture` or `Tooling & CI`.) |
| `Tooling & CI`           | blog, projects  | Build tools, package managers, lint configs, GitHub Actions, deploy pipelines, monorepo tooling, error-monitoring setup.                                |
| `Architecture`           | blog, projects  | System design, module boundaries, composition patterns, state-management shape, content pipelines, structural debugging. Not component-level work.      |
| `Testing`                | blog, projects  | Unit, integration, visual regression, E2E; testing philosophy and test design.                                                                          |
| `Career Experience`      | experience only | Every experience entry; never blog or projects.                                                                                                         |

**Tags:** 3–8 per entry, **canonical values only** (below), never duplicating the entry's own category — the category is the coarse bucket, tags are the narrower drill-downs. Cross-reference tags are category names used on entries _not_ in that category (a `Frontend Engineering` post may tag `Accessibility`). Intentionally excluded: industry tags (Healthcare, Wine), vague concepts (Refactoring, Team Leadership, State Management), marketing noise (SPA, Modern, Enterprise) — industry context belongs in body prose, and vague tags don't help discovery.

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

## Anti-patterns

Never use these. The fingerprint's hard nos (rhetorical questions, staccato emphasis, writerly flourishes, service-name soup, "we" for solo credit, em dashes in short-form) apply here too.

- **Filler verbs:** spanning, leveraging, diving into, empowering, delighting, unlocking, unleashing, transforming
- **Marketing clichés:** world-class, cutting-edge, best-in-class, seamless, revolutionary, game-changing
- **Corporate jargon:** synergy, synergize, circle back, move the needle, low-hanging fruit, value-add, ideate
- **Journey metaphors:** journey, path, adventure, story (unless literally about a story)
- **Vague authority:** industry-leading, enterprise-grade, proven
- **Preview openers:** "In this post we'll explore..." — lead with the hook
- **Closers that restate the post:** the takeaway must add something, not summarize

## Long-form structure (blog + case studies)

1. **The problem** — what was broken, wrong, or missing (1–2 paragraphs)
2. **The approach** — what the spec, platform, or pattern suggests (1–2 paragraphs + optional code)
3. **The implementation** — real code with prose explaining decisions (1–3 sections)
4. **The result** — what changed, what was gained (short list or paragraph)
5. **The takeaway** — one generalizable principle in active voice, first-person singular (1–2 sentences)

**Section economy:** if a code block already shows a detail, fold the mention into a nearby sentence instead of a dedicated section — five tight sections beat seven with redundancy. Posts about a script or config include the complete artifact.

## Self-check: short-form

Run before shipping any title, excerpt, headline, or CTA:

1. First-person singular voice; no "we"/"our" for solo work
2. Under the surface's character budget
3. Zero em dashes
4. Zero anti-pattern words, zero rhetorical questions
5. Correct tense for the surface
6. Specific — names a technology, number, or outcome ("A component library" is weak; "A React component library adopted by 80% of apps" is specific)
7. Wince test: read aloud — if it sounds like LinkedIn or a press release instead of Daniel talking, loosen it

## Self-check: long-form

Run before finalizing any draft:

1. Flow check — no staccato fragments; join thoughts with semicolons, colons, or conjunctions
2. Em dashes only as true parenthetical asides
3. Hook opens; no flat inventory, no preview opener
4. Plain words — would Daniel say it that way to a dev friend?
5. Every "X happened" has a "because Y" or "which meant Z"
6. Takeaway adds a concrete principle; doesn't restate the post
7. No section re-explains what a code block shows; full artifacts included
8. Zero rhetorical questions
9. "I" for credit and decisions; "we" only as system-voice for software behavior
10. Wince test: read aloud — if it reads like a polished essay, rewrite it
