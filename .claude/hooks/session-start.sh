#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions, where the container
# starts from a fresh clone with no node_modules.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async: the session starts immediately while npm install runs in the
# background. Be aware Claude may briefly act before deps finish installing.
echo '{"async": true, "asyncTimeout": 300000}'

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install dependencies so `npm run dev`/`build` work immediately.
# `npm install` (not `npm ci`) so the cached container layer can be reused.
npm install
