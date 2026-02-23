#!/bin/bash
# Hook: Stop
# Runs full validation suite after Claude finishes responding.
# Only runs if src/ files have uncommitted changes.
# Exit 0 = allow stop, Exit 2 = block stop (Claude sees errors and tries to fix)

# Skip if no source changes
CHANGES=$(git status --porcelain -- src/ 2>/dev/null | head -1)
if [ -z "$CHANGES" ]; then
  exit 0
fi

echo "Running validation suite..."

pnpm format
if [ $? -ne 0 ]; then
  echo "FAILED: pnpm format" >&2
  exit 2
fi

pnpm lint
if [ $? -ne 0 ]; then
  echo "FAILED: pnpm lint" >&2
  exit 2
fi

pnpm typecheck
if [ $? -ne 0 ]; then
  echo "FAILED: pnpm typecheck" >&2
  exit 2
fi

pnpm build
if [ $? -ne 0 ]; then
  echo "FAILED: pnpm build" >&2
  exit 2
fi

pnpm test
if [ $? -ne 0 ]; then
  echo "FAILED: pnpm test" >&2
  exit 2
fi

echo "All validations passed."
exit 0
