---
'@danieljoffe/shared-ui': minor
---

Accessibility: section labels are now real headings. `SectionLabel` renders its
label as a semantic heading (`<h2>` by default, with an optional `as="h3"` for
nested sections) instead of a styled `<span>`, so screen-reader heading
navigation works. Adds a `sectionLabel` `Heading` variant (the eyebrow-label
look, defaults to `h2`), and `Heading`'s `as` prop now accepts an explicit
`undefined` (for `exactOptionalPropertyTypes` callers that forward it).
