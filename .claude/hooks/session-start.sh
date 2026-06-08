#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions, where the container
# starts from a fresh clone with no node_modules.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install dependencies so `npm run dev`/`build` work immediately.
# `npm install` (not `npm ci`) so the cached container layer can be reused.
npm install
