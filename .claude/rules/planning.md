# Research Before Planning

When the user asks to plan, design, or architect a feature or change:

1. Identify the libraries, frameworks, and APIs involved in the planned work
2. Use context7 (`resolve-library-id` then `query-docs`) to fetch current documentation for each relevant technology
3. Ground your plan in current API surfaces and best practices, not training data
4. Cite documentation sources when making specific technical recommendations

This applies when the user says things like: "plan", "design", "architect", "how should we", "what's the best approach", "let's think about how to", "strategy for".

# Context-Mode for Large Output

Route commands that produce >20 lines of output through context-mode MCP tools, not native Bash/Read:

- **`ctx_batch_execute`**: test suites, lint/mypy, git diffs, git log, any verbose Bash command
- **`ctx_search`**: retrieve specifics from previously indexed output
- **`ctx_execute` / `ctx_execute_file`**: analyze large output, log processing, data transforms

Still use native tools for: `Read` on files you intend to `Edit`, `Grep`/`Glob` for targeted search, `Edit`/`Write` for modifications, short Bash commands (git add, commit, push, mkdir).
