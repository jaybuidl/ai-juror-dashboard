#!/usr/bin/env bash
# Stop hook: run `yarn lint` at end-of-turn and block the stop (feeding the errors
# back to the model) if Biome exits non-zero. Silent on success.
#
# The only other gate in this project is the Netlify build, which runs `yarn build:ci`
# at deploy time — far too late to be useful, and after the model that introduced the
# problem has lost its context. Checking at end-of-turn catches a regression while the
# turn that caused it can still fix it.
#
# Mirrors agentkit/.claude/hooks/lint-check.sh; that repo is on pnpm, this one on yarn.

set -u

INPUT=$(cat)

# Prevent an infinite retry loop: if Claude Code already invoked us and the model is
# trying to stop again after acting on our feedback, let it through.
if printf '%s' "$INPUT" | grep -q '"stop_hook_active":[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# Skip if there is no lint script, so the hook stays harmless if copied elsewhere.
if ! grep -q '"lint"[[:space:]]*:' package.json 2>/dev/null; then
  exit 0
fi

# Skip rather than fail if yarn is unreachable (a shell without corepack or Volta on
# PATH). A missing package manager is an environment problem, not a lint finding, and
# blocking the turn over it would be noise the model cannot act on.
if ! command -v yarn >/dev/null 2>&1; then
  exit 0
fi

LINT_OUTPUT=$(yarn lint 2>&1)
LINT_EXIT=$?

if [ "$LINT_EXIT" -eq 0 ]; then
  exit 0
fi

# Non-zero: emit to stderr and exit 2, which blocks the stop and feeds the output back.
{
  echo "yarn lint failed (exit $LINT_EXIT). Fix these errors before ending the turn:"
  echo
  echo "$LINT_OUTPUT"
} >&2
exit 2
