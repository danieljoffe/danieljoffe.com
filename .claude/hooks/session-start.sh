#!/bin/bash
# SessionStart hook: injects previous session context and recent decisions
#
# On session start, outputs:
# 1. The latest session handoff notes (if any)
# 2. The most recent decisions from the decisions log
#
# This gives Claude immediate context about what happened in prior sessions.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SESSIONS_DIR="$PROJECT_DIR/.claude/sessions"
DECISIONS_FILE="$PROJECT_DIR/.claude/docs/decisions.md"

# --- Session handoff notes ---
if [ -f "$SESSIONS_DIR/latest.md" ]; then
  CONTENT=$(cat "$SESSIONS_DIR/latest.md")
  if [ -n "$CONTENT" ]; then
    echo "<session-handoff>"
    echo "$CONTENT"
    echo "</session-handoff>"
    echo ""
  fi
fi

# --- Recent decisions (last 30 lines) ---
if [ -f "$DECISIONS_FILE" ]; then
  RECENT=$(tail -30 "$DECISIONS_FILE")
  if [ -n "$RECENT" ]; then
    echo "<recent-decisions>"
    echo "$RECENT"
    echo "</recent-decisions>"
  fi
fi

exit 0
