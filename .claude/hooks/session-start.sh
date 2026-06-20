#!/bin/bash
# SessionStart hook: injects an INDEX of recent architectural decisions (titles
# only) to keep the always-loaded budget small. Read .claude/docs/decisions.md
# for the full rationale of any entry.
# Transient session state is handled by the context-mode plugin (SQLite-backed).

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
DECISIONS_FILE="$PROJECT_DIR/.claude/docs/decisions.md"

if [ -f "$DECISIONS_FILE" ]; then
  RECENT=$(grep -E '^#{2,3} ' "$DECISIONS_FILE" | tail -12)
  if [ -n "$RECENT" ]; then
    echo "<recent-decisions note=\"titles only — read .claude/docs/decisions.md for detail\">"
    echo "$RECENT"
    echo "</recent-decisions>"
  fi
fi
exit 0
