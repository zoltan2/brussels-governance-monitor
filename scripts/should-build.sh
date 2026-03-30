#!/bin/bash
# Vercel Ignored Build Step — exit 1 = build, exit 0 = skip
# https://vercel.com/docs/projects/overview#ignored-build-step

echo "Checking if build is needed..."

CHANGED=$(git diff HEAD^ HEAD --name-only 2>/dev/null)

# If git diff fails (first commit, force deploy, etc.) → always build
if [ -z "$CHANGED" ]; then
  echo "→ Cannot determine changes, proceeding with build"
  exit 1
fi

if echo "$CHANGED" | grep -qE '^(src/|content/|data/|public/|messages/|package|next\.config|velite\.config|tsconfig)'; then
  echo "→ Relevant files changed, proceeding with build"
  exit 1
fi

echo "→ No relevant files changed, skipping build"
echo "  Changed files were:"
echo "$CHANGED" | sed 's/^/    /'
exit 0
