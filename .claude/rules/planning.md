# Research Before Planning

When planning or designing something that touches an **unfamiliar or fast-moving**
library, framework, or API, ground the plan in current docs (context7:
`resolve-library-id` → `query-docs`) rather than training data, and cite sources for
specific technical claims. Skip this for routine changes against well-known, stable APIs.

# Context-Mode for Large Output

**Prefer** context-mode for genuinely large or repeated output — to keep it off the prompt:

- **`ctx_batch_execute`**: test suites, lint, verbose builds, git log/diff
- **`ctx_search`**: retrieve specifics from previously indexed output
- **`ctx_execute` / `ctx_execute_file`**: analyze large output, log processing, data transforms

This is a **preference, not a hard gate.** Native tools are fine — and often better — for
`Read`/`Grep`/`Glob`/`Edit`, short Bash, HTTP calls (`curl`), shell loops, and anything the
sandbox mangles. Don't contort a simple command to route it through context-mode.
