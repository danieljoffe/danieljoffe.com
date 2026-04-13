#!/bin/bash
# SessionEnd hook: archives session notes for future reference
#
# On session end, copies latest.md to the archive directory with a timestamp.
# Must be fast — SessionEnd hooks have a 1.5s default timeout.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SESSIONS_DIR="$PROJECT_DIR/.claude/sessions"
ARCHIVE_DIR="$SESSIONS_DIR/archive"
LATEST="$SESSIONS_DIR/latest.md"

# Nothing to archive if no session notes exist
[ -f "$LATEST" ] || exit 0

# Only archive if the file has meaningful content (more than just the template)
LINES=$(wc -l < "$LATEST" 2>/dev/null)
[ "$LINES" -le 5 ] && exit 0

# Create archive directory if needed
mkdir -p "$ARCHIVE_DIR"

# Archive with timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
cp "$LATEST" "$ARCHIVE_DIR/${TIMESTAMP}.md"

exit 0
