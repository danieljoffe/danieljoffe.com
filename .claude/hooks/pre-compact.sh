#!/bin/bash
# PreCompact hook: reminds Claude to save session state before context compression
#
# Fires right before conversation compaction (manual or auto).
# Outputs instructions that get included in the compaction context,
# ensuring key information survives the compression.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SESSIONS_DIR="$PROJECT_DIR/.claude/sessions"

echo "[SESSION PERSISTENCE] Context is about to be compacted."
echo ""
echo "Before proceeding, update .claude/sessions/latest.md with:"
echo "  - Current branch and git state"
echo "  - What was accomplished so far this session"
echo "  - Any decisions made (also append to .claude/docs/decisions.md)"
echo "  - Open questions or unresolved issues"
echo "  - Immediate next steps"
echo ""

# Show current session notes so Claude knows what's already captured
if [ -f "$SESSIONS_DIR/latest.md" ]; then
  echo "Current session notes:"
  echo "---"
  cat "$SESSIONS_DIR/latest.md"
  echo "---"
fi

exit 0
