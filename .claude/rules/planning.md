# Research Before Planning

When planning or designing something that touches an **unfamiliar or fast-moving**
library, framework, or API, ground the plan in current docs (context7:
`resolve-library-id` → `query-docs`) rather than training data, and cite sources for
specific technical claims. Skip this for routine changes against well-known, stable APIs.

# Context-Mode Is a Preference, Not a Gate

The plugin already injects its usage guidance every session. The counterweight: native
tools are fine — and often better — for `Read`/`Grep`/`Glob`/`Edit`, short Bash, `curl`,
shell loops, and anything the sandbox mangles. Don't contort a simple command to route it
through context-mode; reserve it for genuinely large or repeated output (test suites,
verbose builds, big diffs).
