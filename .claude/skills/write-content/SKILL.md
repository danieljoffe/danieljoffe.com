---
name: write-content
description: Propose and draft blog posts or project case studies from work completed between develop and main
disable-model-invocation: true
user-invocable: true
argument-hint: '<draft slug-name> to skip proposals and draft a specific topic'
---

# Write Content from Completed Work

Analyze the diff between `develop` and `main`, identify content-worthy work, propose topics, and draft MDX posts.

## Instructions

### Phase 1: Analyze the work

1. Run `git fetch origin` to ensure both branches are current.
2. Run `git log main..develop --oneline --merges` to find merged PRs.
3. For each merged PR, run `gh pr view <number> --json title,body,labels,number,files` to get full context.
4. Run `git diff main..develop --stat` for the overall change footprint.
5. For notable changes, read the actual code diffs to understand the technical details — don't rely solely on PR descriptions.

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
Angle: What makes this interesting beyond "we did X"
Key sections: ...

### 2. ...
```

Wait for the user to pick which topics to draft before proceeding.

### Phase 3: Draft content

When the user selects a topic (or invokes with `/write-content draft <slug>`):

1. **Determine content type**: `blog` for technique/lesson posts, `project` for case studies showcasing outcomes.

2. **Read existing content** for voice and structure calibration:
   - Read 2-3 existing posts of the same type from `apps/root/src/data/content/{blog,projects}/`
   - Match the tone: technical but conversational, first-person plural ("we"), concrete code examples, clear section progression
   - Match the structure: problem → approach → implementation → result → takeaway

3. **Draft the MDX file** with the required metadata export:

   ```mdx
   export const metadata = {
     title: 'Descriptive, specific title',
     date: 'YYYY-MM-DD', // Today for blog; git creation date for projects
     excerpt: 'One compelling sentence for previews and SEO',
     author: 'Daniel Joffe',
     category: 'Category Name',
     tags: ['Tag1', 'Tag2'],
     slug: 'url-slug',
     type: 'blog', // or 'project'
   };

   ## Section heading

   Content...
   ```

4. **Content guidelines**:
   - Lead with the problem or tension — why should the reader care?
   - Show real code from the actual implementation, not contrived examples
   - Include the decision-making process — what alternatives were considered?
   - End with a concrete takeaway or principle, not a generic summary
   - Keep it under 800 words — these are sharp technical posts, not tutorials
   - Use code blocks with language hints (`tsx`, `bash`, `css`)
   - No emojis, no "In this post we'll explore..." filler

5. **Complete the post checklist** (from CLAUDE.md "Adding a New Post"):
   - Create the `.mdx` file in the correct `data/content/{type}/` directory
   - Add the slug constant to `data/blog.ts`, `data/project.ts`, or `data/experience.ts`
   - Add the thumbnail record to `{type}Thumbnails.ts`
   - Import the MDX component **and metadata** in the corresponding `data/content/{type}/index.ts`
   - Insert the slug into the correct position in `contentOrder.ts`
   - Add structured data in `data/structuredData/`

6. **Verify**: Run `yarn tsc --noEmit` and `npx nx test root` to ensure the new content integrates cleanly.

## Rules

- Never fabricate technical details — all code examples and claims must come from the actual diff.
- Never propose content for work that isn't meaningfully complete (WIP branches, half-merged features).
- Blog posts are about the _technique or lesson_, not a changelog entry. "We added ARIA attributes to Dropdown" is a changelog; "Building keyboard navigation that doesn't fight the browser" is a blog post.
- Project case studies are about the _outcome and craft_, not the implementation diary.
- If there's genuinely nothing content-worthy in the diff, say so and stop.
- When reading code for examples, use the version on `develop` (the completed work), not `main`.
