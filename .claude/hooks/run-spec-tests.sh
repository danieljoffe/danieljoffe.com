#!/bin/bash
# PostToolUse hook: runs related unit tests when a spec file is edited

command -v jq >/dev/null || exit 0

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a spec file
[ -z "$FILE_PATH" ] && exit 0
echo "$FILE_PATH" | grep -qE '\.spec\.tsx?$' || exit 0

# Use the spec filename (e.g. "page.spec.tsx") as the pattern for an exact match
SPEC_FILE=$(basename "$FILE_PATH")
# macOS doesn't have `timeout`; use perl one-liner as portable fallback
if command -v timeout >/dev/null 2>&1; then
  OUTPUT=$(timeout 60 npx nx test root -- --testPathPatterns="$SPEC_FILE" --no-coverage 2>&1)
  RC=$?
else
  OUTPUT=$(perl -e 'alarm 60; exec @ARGV' npx nx test root -- --testPathPatterns="$SPEC_FILE" --no-coverage 2>&1)
  RC=$?
fi

# timeout exits 124, perl alarm sends SIGALRM (RC=142) when the command is killed
if [ $RC -eq 124 ] || [ $RC -eq 142 ]; then
  echo "TIMEOUT: tests exceeded 60s limit" >&2
  exit 2
fi

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
