# Content Style Guide & Tone

Voice, structure, and tone rules for all blog posts and project case studies on danieljoffe.com.

### Voice

- **First-person plural.** Use "we" and "our." You're a peer sharing what you learned, not a teacher.
- **Open with the problem.** No preamble. Jump straight into the tension.
- **Short concept headings.** Name the thing, not the action: "The Z-Index Stack" not "How We Fixed Z-Index Issues."
- **Show real code.** The prose explains the _why_, the code shows the _what_. Minimal inline comments. If a code block already demonstrates something (e.g., an `aria-hidden` attribute), don't create a separate section to explain it. Fold the explanation into a sentence near the code.
- **Close with a principle, grounded in specifics.** Active voice, first-person plural. Don't restate what the post already said. Name concrete alternatives, scope the principle ("Reserve Actions for caching, deployment orchestration, multi-platform matrices"), or reframe the topic ("API consistency in a form library isn't ergonomics. It's accessibility."). The last line should land with punch.

### Punctuation

- **Periods, colons, and semicolons for clause breaks. Em dashes sparingly.** Em dashes create choppiness when overused. Reserve them for true parenthetical asides.
  - Period for independent clauses: "The negative assertion matters. It documents that the wrapper should not have the attribute."
  - Colon to introduce a consequence or list: "the actual interactive element: the `<button>`, `<a>`, or whatever the child is."
  - Semicolon to link related clauses: "A reasonable constraint; a tooltip without an interactive trigger element isn't useful."
  - NO: "The error itself is harmless — React recovers by re-rendering."
- **Commas for parenthetical asides in flowing prose.** "When the logo changes, and it will, we run one command."
- **Scare quotes for irony only.** Use them when a word means the opposite ("free" web tool, "invisible" sheet). Don't use them for technical terms.

### Tone

- **Add human color and context.** Show the team's reaction or the stakes. "We shipped a mobile bottom navigation bar with much excitement" not just "We shipped a mobile bottom navigation bar."
- **Explain the _why_ in the same sentence as the _what_.** "You couldn't tap it because it was inaccessible" is better than leaving the reader to infer.
- **Use "should" for prescriptive architecture decisions.** "`<header>` should wrap only the desktop nav" reads as guidance. "`<header>` wraps only the desktop nav" reads as description.
- **Present tense for excerpts and descriptions.** "A nav redesign passes code review but fails E2E tests" is more immediate than past tense.

### Structure

1. **The problem** — what was broken, wrong, or missing (1-2 paragraphs)
2. **The approach** — what the spec/platform/pattern says (1-2 paragraphs + optional code)
3. **The implementation** — real code with prose explaining decisions (1-3 sections)
4. **The result** — what changed, what was gained (short list or paragraph)
5. **The takeaway** — one generalizable principle, active voice, first-person plural (1-2 sentences)

**Section economy:** Every section should advance the reader's understanding. If a code block already shows a detail (an attribute, a pattern), don't create a dedicated section to re-explain it. Fold it into a sentence near the code. Five tight sections beat seven with redundancy.

### Self-check before finalizing

1. **Em dash audit.** Replace most with periods, colons, or semicolons.
2. **Consequence check.** Every "X happened" should have a "because Y" or "which meant Z."
3. **Takeaway voice.** Does it end with a concrete, punchy line? Not a restatement of the post, but a principle with teeth.
4. **Redundancy check.** Does any section just re-explain what a code block already shows? Fold it or cut it.
5. **Full artifacts.** If the post is about a script or config, is the complete version included?
