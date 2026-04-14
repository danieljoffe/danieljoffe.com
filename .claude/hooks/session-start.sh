#!/bin/bash
# SessionStart hook: injects recent architectural decisions
# Transient session state is handled by the context-mode plugin (SQLite-backed).
# This hook supplements it with the curated decisions log.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
DECISIONS_FILE="$PROJECT_DIR/.claude/docs/decisions.md"

if [ -f "$DECISIONS_FILE" ]; then
  RECENT=$(tail -30 "$DECISIONS_FILE")
  if [ -n "$RECENT" ]; then
    echo "<recent-decisions>"
    echo "$RECENT"
    echo "</recent-decisions>"
  fi
fi
exit 0
