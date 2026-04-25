#!/bin/bash
# PostToolUse hook: runs related unit tests when a spec/test file is edited
# Supports root (Jest), shared-ui (Vitest), and falls back gracefully

command -v jq >/dev/null || exit 0

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a test file
[ -z "$FILE_PATH" ] && exit 0
echo "$FILE_PATH" | grep -qE '\.(spec|test)\.(tsx?|jsx?)$' || exit 0

SPEC_FILE=$(basename "$FILE_PATH")

# Determine project and test args from file path
case "$FILE_PATH" in
  */libs/shared/ui/*)
    PROJECT="@danieljoffe.com/shared-ui"
    TEST_ARGS="-- $SPEC_FILE"
    ;;
  */apps/root/*)
    PROJECT="root"
    TEST_ARGS="-- --testPathPatterns=$SPEC_FILE --no-coverage"
    ;;
  *)
    # Default to root for backward compatibility
    PROJECT="root"
    TEST_ARGS="-- --testPathPatterns=$SPEC_FILE --no-coverage"
    ;;
esac

# macOS doesn't have `timeout`; use perl one-liner as portable fallback
if command -v timeout >/dev/null 2>&1; then
  OUTPUT=$(timeout 60 pnpm nx test "$PROJECT" $TEST_ARGS 2>&1)
  RC=$?
else
  OUTPUT=$(perl -e 'alarm 60; exec @ARGV' pnpm nx test "$PROJECT" $TEST_ARGS 2>&1)
  RC=$?
fi

# timeout exits 124, perl alarm sends SIGALRM (RC=142) when the command is killed
if [ $RC -eq 124 ] || [ $RC -eq 142 ]; then
  echo "TIMEOUT: tests exceeded 60s limit" >&2
  exit 2
fi

SUMMARY=$(echo "$OUTPUT" | grep -E '(Tests:|Test Suites:|Test Files:)' | head -2)

if [ $RC -eq 0 ]; then
  echo "PASS: $SUMMARY" >&2
  exit 0
else
  echo "FAIL: $SUMMARY" >&2
  echo "" >&2
  echo "$OUTPUT" | tail -20 >&2
  exit 2
fi
