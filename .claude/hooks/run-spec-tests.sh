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

# Worktree-aware cwd. When Claude edits a file inside a git worktree
# (e.g. /tmp/wt-*/...), this hook runs from $CLAUDE_PROJECT_DIR — the
# main checkout — and pnpm nx looks for the spec in the wrong tree.
# `git -C <file-dir> rev-parse --show-toplevel` returns the root of
# whichever worktree contains the file; cd there before running tests.
# Falls back to current cwd if the file isn't inside a git repo (rare
# for spec files, but defensive).
FILE_DIR=$(dirname "$FILE_PATH")
WORKTREE_ROOT=$(git -C "$FILE_DIR" rev-parse --show-toplevel 2>/dev/null)
if [ -n "$WORKTREE_ROOT" ] && [ -d "$WORKTREE_ROOT" ]; then
  cd "$WORKTREE_ROOT" || exit 0
fi

# Determine project and test args from file path
case "$FILE_PATH" in
  */apps/*-e2e/*)
    # Playwright e2e specs share the *.spec.ts extension but aren't unit
    # tests — skip cleanly. CI's `nx affected -t e2e` picks them up.
    exit 0
    ;;
  */libs/shared/ui/*)
    PROJECT="@danieljoffe/shared-ui"
    TEST_ARGS="-- $SPEC_FILE"
    ;;
  */apps/root/*)
    PROJECT="root"
    TEST_ARGS="-- --testPathPatterns=$SPEC_FILE --no-coverage"
    ;;
  */apps/wyrdfold/*)
    PROJECT="wyrdfold"
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
