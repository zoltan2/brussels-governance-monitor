#!/bin/bash
# Vercel Ignored Build Step — returns exit 0 to SKIP, exit 1 to BUILD
# Docs: https://vercel.com/docs/projects/overview#ignored-build-step
#
# Rules:
# - Always build production (main branch)
# - Skip dependabot branches
# - Skip chore/ and docs/ branches (no preview needed)
# - Build feat/ and fix/ branches (preview useful)
# - Skip everything else

BRANCH="$VERCEL_GIT_COMMIT_REF"
AUTHOR="$VERCEL_GIT_COMMIT_AUTHOR_LOGIN"

echo "Branch: $BRANCH | Author: $AUTHOR"

# Always build production
if [ "$VERCEL_ENV" = "production" ]; then
  echo "✓ Production build — proceeding"
  exit 1
fi

# Skip dependabot
if [ "$AUTHOR" = "dependabot[bot]" ]; then
  echo "⊘ Dependabot preview — skipping"
  exit 0
fi

# Skip chore/ docs/ content/ style/ branches
case "$BRANCH" in
  chore/*|docs/*|content/*|style/*)
    echo "⊘ $BRANCH preview — skipping"
    exit 0
    ;;
esac

# Build feat/ and fix/ branches
case "$BRANCH" in
  feat/*|fix/*|refactor/*)
    echo "✓ $BRANCH preview — proceeding"
    exit 1
    ;;
esac

# Skip anything else
echo "⊘ Unknown branch $BRANCH — skipping"
exit 0
