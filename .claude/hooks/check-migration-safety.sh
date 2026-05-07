#!/bin/bash
# PreToolUse Bash hook — runs on every Bash invocation.
# Fast-exits unless the command is a `git commit` and supabase migrations are staged.
#
# Catches the bug classes that have hit this repo before:
#   1. Editing an already-deployed migration file (must be forward-only)
#   2. CREATE TABLE / CREATE INDEX / ALTER TABLE without idempotency guards
#   3. auth.uid() in a policy without the (SELECT ...) wrap (perf, not safety —
#      block as warning, exit 0)
#
# Exit codes:
#   0  pass / no migrations staged / not a commit command
#   2  block — Claude sees the stderr and should rethink

command -v jq >/dev/null || exit 0

INPUT=$(cat /dev/stdin)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Fast-exit: not a commit
case "$COMMAND" in
  *git*commit*) ;;
  *) exit 0 ;;
esac

# Fast-exit: no supabase migrations staged
STAGED=$(git diff --cached --name-only 2>/dev/null | grep -E '^supabase/migrations/.*\.sql$' || true)
[ -z "$STAGED" ] && exit 0

ERRORS=()
WARNINGS=()

# 1. Forward-only check: a staged file that already exists in origin/main
#    means the author edited a deployed migration. Hard fail.
git fetch origin main --quiet 2>/dev/null || true
MAIN_REF=$(git rev-parse origin/main 2>/dev/null || git rev-parse main 2>/dev/null)

if [ -n "$MAIN_REF" ]; then
  for f in $STAGED; do
    # Was this file already in main?
    if git cat-file -e "${MAIN_REF}:${f}" 2>/dev/null; then
      # Check the staged version against the main version
      MAIN_HASH=$(git ls-tree -r "$MAIN_REF" "$f" 2>/dev/null | awk '{print $3}')
      STAGED_HASH=$(git diff --cached --raw "$f" 2>/dev/null | awk '{print $4}')
      if [ -n "$MAIN_HASH" ] && [ -n "$STAGED_HASH" ] && [ "$MAIN_HASH" != "$STAGED_HASH" ]; then
        ERRORS+=("$f: edited a migration that is already in origin/main. Migrations are forward-only — write a new dated migration instead.")
      fi
    fi
  done
fi

# 2. Idempotency guards on staged content
for f in $STAGED; do
  CONTENT=$(git diff --cached "$f" | grep '^+' | grep -v '^+++')

  # CREATE TABLE without IF NOT EXISTS
  if echo "$CONTENT" | grep -iE '^\+\s*CREATE TABLE' | grep -ivE 'IF NOT EXISTS' >/dev/null; then
    ERRORS+=("$f: CREATE TABLE missing IF NOT EXISTS — fresh-DB rebuilds will fail on re-apply.")
  fi

  # CREATE INDEX without IF NOT EXISTS
  if echo "$CONTENT" | grep -iE '^\+\s*CREATE (UNIQUE )?INDEX' | grep -ivE 'IF NOT EXISTS' >/dev/null; then
    ERRORS+=("$f: CREATE INDEX missing IF NOT EXISTS.")
  fi

  # ADD COLUMN without IF NOT EXISTS (only catch single-line cases — multi-line
  # ALTER TABLE blocks need a smarter parser, defer to the agent)
  if echo "$CONTENT" | grep -iE '^\+\s*ADD COLUMN [a-z_]+ ' | grep -ivE 'IF NOT EXISTS' >/dev/null; then
    ERRORS+=("$f: ADD COLUMN missing IF NOT EXISTS.")
  fi

  # ADD CONSTRAINT without DO $$ guard (Postgres has no IF NOT EXISTS for these)
  if echo "$CONTENT" | grep -iE '^\+\s*(ALTER TABLE.*)?ADD CONSTRAINT [a-z_]+' >/dev/null; then
    if ! grep -iE 'pg_constraint|conname' "$f" >/dev/null 2>&1; then
      WARNINGS+=("$f: ADD CONSTRAINT without a DO \$\$ ... pg_constraint guard — may break re-applies. (Pattern: see 20260428120002_create_notification_tables.sql)")
    fi
  fi

  # Bare auth.uid() in a CREATE/ALTER POLICY (RLS perf).
  # Strategy: collect +lines referencing auth.uid(), strip the (SELECT
  # auth.uid()) occurrences, then check what remains. Anything left is
  # an unwrapped call.
  if echo "$CONTENT" | grep -iE '(CREATE|ALTER) POLICY' >/dev/null; then
    BARE=$(echo "$CONTENT" | grep -E '^\+' | grep -E 'auth\.uid\(\)' \
      | sed -E 's/\(SELECT[[:space:]]+auth\.uid\(\)\)//gi')
    if echo "$BARE" | grep -E 'auth\.uid\(\)' >/dev/null; then
      WARNINGS+=("$f: bare auth.uid() in a policy — wrap in (SELECT auth.uid()) for 5-10× RLS perf on large tables. See https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations")
    fi
  fi
done

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "Migration safety warnings:" >&2
  for w in "${WARNINGS[@]}"; do
    echo "  ⚠ $w" >&2
  done
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "" >&2
  echo "Migration safety errors (commit blocked):" >&2
  for e in "${ERRORS[@]}"; do
    echo "  ✗ $e" >&2
  done
  echo "" >&2
  echo "Fix the issues or, if intentional, append --no-verify to bypass. Hard-bypass with care." >&2
  exit 2
fi

exit 0
