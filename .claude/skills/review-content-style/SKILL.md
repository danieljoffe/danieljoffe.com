---
name: review-content-style
description: Scan app content (MDX posts, page copy) against the content style guide for tone, punctuation, and structure violations
disable-model-invocation: true
user-invocable: true
argument-hint: '<content-type or file path> to scope the review (e.g. "blog", "projects", or a specific MDX file)'
---

# Review Content Style

Scan content against the [Content Style Guide](../../docs/content-style-guide.md) and flag violations.

## Instructions

1. **Load the style guide**: Read `.claude/docs/content-style-guide.md` to load the full set of rules.

2. **Determine scope**: Based on the argument:
   - `blog` → scan all files in `apps/root/src/data/content/blog/*.mdx`
   - `projects` → scan all files in `apps/root/src/data/content/projects/*.mdx`
   - `experience` → scan all files in `apps/root/src/data/content/experience/*.mdx`
   - A specific file path → scan that file only
   - No argument → scan all MDX content files across all types

3. **For each file**, check against every rule in the style guide:

   ### Voice checks
   - Uses first-person plural ("we"/"our"), not "I" or passive voice
   - Opens with the problem, no preamble or "In this post..." filler
   - Section headings name the thing, not the action ("The Z-Index Stack" not "How We Fixed Z-Index Issues")
   - Code blocks show real implementation, not contrived examples
   - Takeaway is active voice, first-person plural, with a concrete principle

   ### Punctuation checks
   - Em dash usage: flag any em dash (—) that could be a period, colon, or semicolon. Only allow for true parenthetical asides.
   - Scare quotes: flag any scare quotes not used for irony

   ### Tone checks
   - Consequences present: every "X happened" should have a "because Y" or "which meant Z"
   - Human color: look for flat statements that could use stakes or team reaction
   - "Should" for prescriptive architecture decisions
   - Present tense in excerpts/descriptions

   ### Structure checks
   - Follows problem → approach → implementation → result → takeaway arc
   - No section that just re-explains what a code block already shows (redundancy check)
   - Under 800 words (sharp technical notes, not tutorials)
   - No emojis

   ### Metadata checks
   - Has required `export const metadata` block
   - Excerpt is one sentence, present tense
   - Tags and category are present

4. **Report findings** as a table per file:

   ```
   ## filename.mdx

   | Line | Rule | Issue | Suggestion |
   |------|------|-------|------------|
   | 14   | Voice: no preamble | Opens with "In this post..." | Lead with the problem directly |
   | 45   | Punctuation: em dash | "harmless — React recovers" | Use period: "harmless. React recovers." |
   ```

   If a file passes all checks, report: `✓ filename.mdx — no issues found`

5. **Summary**: At the end, provide a count: X files scanned, Y issues found, Z files clean.

## Rules

- Do NOT auto-fix files. This skill is read-only — report issues for the user to review.
- Flag real violations, not style preferences. If the usage is defensible under the guide, don't flag it.
- When flagging em dashes, only flag overuse (3+ in one post) or cases where a period/colon/semicolon is clearly better.
- Do not flag code blocks for style issues — only prose.
