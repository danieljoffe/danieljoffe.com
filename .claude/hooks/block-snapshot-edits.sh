#!/bin/bash
# PreToolUse hook: blocks direct edits to snapshot files

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

if echo "$FILE_PATH" | grep -qE '-snapshots/'; then
  echo "BLOCK: Snapshot files should be updated via CI workflow_dispatch, not edited directly" >&2
  exit 2
fi

exit 0
