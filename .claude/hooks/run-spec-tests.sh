#!/bin/bash
# PostToolUse hook: runs related unit tests when a spec file is edited

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a spec file
[ -z "$FILE_PATH" ] && exit 0
echo "$FILE_PATH" | grep -qE '\.spec\.tsx?$' || exit 0

PATTERN=$(basename "$FILE_PATH" | sed 's/\.spec\.tsx$//' | sed 's/\.spec\.ts$//')
OUTPUT=$(npx nx test root -- --testPathPatterns="$PATTERN" --no-coverage 2>&1)
RC=$?

SUMMARY=$(echo "$OUTPUT" | grep -E '(Tests:|Test Suites:)' | head -2)

if [ $RC -eq 0 ]; then
  echo "PASS: $SUMMARY" >&2
  exit 0
else
  echo "FAIL: $SUMMARY" >&2
  echo "" >&2
  echo "$OUTPUT" | tail -20 >&2
  exit 2
fi
