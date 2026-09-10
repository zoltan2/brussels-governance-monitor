#!/usr/bin/env bash
# Usage: run.sh <base_ref>   (ex: run.sh origin/main)
# Le caller doit avoir fetché base_ref (CI: fetch-depth 0 ; preflight: git fetch).
# Diff trois-points (merge-base) ; ne linte que les .mdx de content/ modifiés.
# SKIP_LASTMODIFIED=1 désactive le check lastModified (miroir du label PR).
set -uo pipefail
BASE_REF="${1:?usage: run.sh <base_ref>}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/content-lint/lib.sh
. "$DIR/lib.sh"

CHANGED="$(git diff --name-only "${BASE_REF}...HEAD" -- 'content/' | grep '\.mdx$' || true)"
if [ -z "$CHANGED" ]; then
  echo "content-lint: aucun .mdx modifié vs ${BASE_REF}, skip"
  exit 0
fi
echo "content-lint: fichiers .mdx modifiés vs ${BASE_REF} :"
printf '%s\n' "$CHANGED" | sed 's/^/  /'

rc=0
printf '%s\n' "$CHANGED" | check_temporal || rc=1
printf '%s\n' "$CHANGED" | check_empty_sources || rc=1
if [ "${SKIP_LASTMODIFIED:-0}" = "1" ]; then
  echo "SKIP: lastModified (--skip-lastmodified)"
else
  printf '%s\n' "$CHANGED" | check_lastmodified "$BASE_REF" || rc=1
fi
exit $rc
