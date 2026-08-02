#!/bin/sh
# Full logic suite. No build step, no dependencies — just node on the real game modules.
set -e
cd "$(dirname "$0")/.."
echo "== structure =="; node tests/structure.mjs
echo "== routes =="; node tests/routes.mjs
echo "== solvability =="; node tests/solve.mjs
