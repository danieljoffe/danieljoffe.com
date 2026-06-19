---
name: write-content
description: Propose and draft blog posts or project case studies from work completed between develop and main
disable-model-invocation: true
user-invocable: true
argument-hint: '<draft slug-name> to skip proposals and draft a specific topic'
---

# Write Content from Completed Work

Analyze the diff between `develop` and `main`, identify content-worthy work, propose topics, and draft MDX posts.

## Token Budget Rules

- Route git log, diff, and `gh pr view` output through `ctx_batch_execute`
- Batch all `gh pr view` calls into a single `ctx_batch_execute` instead of calling per-PR

## Instructions

### Phase 1: Analyze the work

1. Run via `ctx_batch_execute`:
   ```
   [
     { "label": "merges",    "command": "git fetch origin && git log main..develop --oneline --merges" },
     { "label": "diff-stat", "command": "git diff main..develop --stat" }
   ]
   ```
2. Extract PR numbers from merge commits, then batch all `gh pr view` calls:
   ```
   [
     { "label": "PR-123", "command": "gh pr view 123 --json title,body,labels,number,files" },
     ...
   ]
   ```
3. For notable changes, use `ctx_search` to find relevant diffs or read the actual code to understand technical details.

### Phase 2: Propose topics (default behavior)

Evaluate each PR or cluster of related PRs for content potential. Score by **notability** — how interesting, educational, or portfolio-relevant the work is.

**High notability** (almost always worth a post):

- Novel architectural decisions with clear trade-offs
- Performance wins with measurable before/after
- Accessibility improvements with WCAG context
- Dependency removals or migrations with a "why not just X?" angle
- Patterns extracted from real code (Rule of Three, etc.)

**Medium notability** (worth a post if the angle is right):

- Design system consistency work (if there's a generalizable lesson)
- CI/tooling improvements (if the debugging story is interesting)
- Refactors that reveal a deeper principle

**Low notability** (skip unless bundled):

- Config tweaks, version bumps, typo fixes
- Routine bug fixes without an interesting root cause
- Test additions without a testing philosophy angle

Present proposals as a ranked list:

```
## Proposed Content

### 1. [blog/project] "Title" (from #PR, #PR)
Type: blog | project
One-line pitch: ...
Angle: What makes this interesting beyond "I did X"
Key sections: ...

### 2. ...
```

Wait for the user to pick which topics to draft before proceeding.

### Phase 3: Draft content

When the user selects a topic (or invokes with `/write-content draft <slug>`):

1. **Determine content type**: `blog` for technique/lesson posts, `project` for case studies showcasing outcomes.

2. **Calibrate voice from the fingerprint, not from existing posts.** The voice anchor is the **"Voice fingerprint"** section of `.claude/docs/content-style-guide.md`, including Daniel's verbatim samples. Read it first and imitate its texture: flowing sentences (no staccato fragments), a hook before the facts, plain words over writerly ones, dry/self-deprecating asides, contractions, no rhetorical questions. **Do _not_ calibrate tone by reading existing posts** — most were AI-drafted and read generic, which is precisely the drift this corrects.
   - Read 2-3 existing posts of the same type **only for structure and metadata shape** (section progression, code-example density, registry wiring) — never for voice.
   - Match the structure: hook → reason → context → implementation → result → takeaway

3. **Draft the MDX file** with the required metadata export. MDX is the single source of truth — thumbnail title, excerpt, cover image, SEO, OG images, and structured data all derive from this one block.

   ```mdx
   export const metadata = {
     title: 'Specific, outcome-driven title (≤ 60 chars)',
     date: 'YYYY-MM-DD', // Today for blog; git creation date for projects
     excerpt: 'One compelling sentence, ≤ 160 chars, no em dashes',
     author: 'Daniel Joffe',
     category: 'Category Name',
     tags: ['Tag1', 'Tag2'],
     slug: 'url-slug',
     type: 'blog', // or 'project'
     cover: {
       alt: 'Short accessible description of the image',
       src: '/photo-xxxxx',
       origin: 'https://unsplash.com/photos/<photo-permalink>',
       creator: '@unsplashHandle',
     },
   };

   ## Section heading

   Content...
   ```

4. **Follow the style guide and tone.** Before drafting, read the full style guide at `.claude/docs/content-style-guide.md`. It has the canonical voice rules, per-surface calibration, length budgets, anti-patterns, and both short-form and long-form self-checks. Do not skip this step — short-form surfaces (thumbnail title, excerpt) have character budgets and voice rules that differ from long-form body prose.

5. **Content guidelines**:
   - Lead with the problem or tension. Why should the reader care?
   - Show real code from the actual implementation, not contrived examples
   - Include the decision-making process. What alternatives were considered?
   - End with a concrete takeaway or principle, not a generic summary
   - Keep it under 800 words. These are sharp technical notes, not tutorials
   - Use code blocks with language hints (`tsx`, `bash`, `css`)
   - No emojis, no "In this post we'll explore..." filler
   - No rhetorical questions, no staccato one-word emphasis, no corporate jargon ("synergy"). Flow sentences together; read the draft aloud and cut anything that sounds like a LinkedIn post
   - When a post is about a script or tool, include the complete version in a dedicated section. Readers should be able to copy-paste and use it

6. **Complete the post checklist** (from CLAUDE.md "Adding a New Post"):
   - Create the `.mdx` file in the correct `data/content/{type}/` directory with the full `metadata` block including `cover`
   - Add the slug constant to `data/blog.ts`, `data/project.ts`, or `data/experience.ts`
   - Import the MDX component **and metadata** in the corresponding `data/content/{type}/index.ts`
   - Insert the slug into the correct position in `contentOrder.ts`
   - For **experience** entries only: add a hand-authored entry to `data/structuredData/experience.ts` (the `Role`/`worksFor` shape). Blog and project structured data are auto-derived from MDX metadata.

7. **Verify**: Run `pnpm tsc --noEmit` and `pnpm nx test root` to ensure the new content integrates cleanly.

## Rules

- Never fabricate technical details — all code examples and claims must come from the actual diff.
- Never propose content for work that isn't meaningfully complete (WIP branches, half-merged features).
- Blog posts are about the _technique or lesson_, not a changelog entry. "I added ARIA attributes to Dropdown" is a changelog; "Building keyboard navigation that doesn't fight the browser" is a blog post.
- Project case studies are about the _outcome and craft_, not the implementation diary.
- If there's genuinely nothing content-worthy in the diff, say so and stop.
- When reading code for examples, use the version on `develop` (the completed work), not `main`.

## Style Guide & Tone

The canonical style guide lives at **`.claude/docs/content-style-guide.md`**. Read it before drafting — it covers:

- **Voice pillars** (direct-with-a-hook, evidence-backed, engaged and irreverent, builder's-eye honesty) and the **Voice fingerprint** section with Daniel's verbatim samples — the canonical "sounds like Daniel" anchor
- **Per-surface calibration** (home hero, about, services, blog body, thumbnail title/excerpt, CTA)
- **Tense rules** (blog = present, project/experience = past, hero/about/services = present)
- **Length budgets** for short-form surfaces (title ≤ 60, excerpt ≤ 160, headline ≤ 60, subtitle ≤ 180, CTA ≤ 50)
- **Anti-patterns** (filler verbs, marketing clichés, journey metaphors, first-person plural for solo work, em dashes in short-form)
- **Long-form structure** (problem → approach → implementation → result → takeaway)
- **Short-form self-check** and **long-form self-check**

When drafting anything, run the appropriate self-check before finalizing. Do not skip — short-form surfaces (thumbnail title, excerpt, hero copy) have character budgets and voice rules that differ from long-form body prose.
