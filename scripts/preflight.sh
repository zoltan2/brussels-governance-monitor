#!/usr/bin/env bash
# Garde-fou local AVANT push. Miroir de deux checks CI qui, sinon, ne tombent
# qu'après coup (et restent rouges sur main) :
#   - Content Lint     (.github/workflows/content-lint.yml) : phrases temporelles + sources vides
#   - Pagefind freshness (.github/workflows/pagefind-freshness.yml) : index régénéré avec le contenu
#
# Appelé automatiquement par .githooks/pre-push. Aussi lançable : `npm run preflight`.
# Bypass ponctuel : `SKIP_PREFLIGHT=1 git push`  (ou `git push --no-verify`).
#
# Le check lastModified du CI n'est PAS reproduit ici (faux positifs fréquents sur
# les fixes de lint ; il dispose de son label PR `skip-lastmodified-check`).
set -uo pipefail

[ "${SKIP_PREFLIGHT:-0}" = "1" ] && { echo "preflight: ignoré (SKIP_PREFLIGHT=1)"; exit 0; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "preflight: hors dépôt git — skip"; exit 0; }
cd "$ROOT" || exit 0

BASE="${PREFLIGHT_BASE:-origin/main}"
git rev-parse --verify -q "$BASE" >/dev/null 2>&1 || { echo "preflight: base '$BASE' introuvable (git fetch ?) — skip"; exit 0; }

RANGE="${BASE}...HEAD"
CHANGED_ALL="$(git diff --name-only "$RANGE" 2>/dev/null || true)"
[ -z "$CHANGED_ALL" ] && { echo "preflight: aucun changement vs $BASE — OK"; exit 0; }

CHANGED_MDX="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^content/.*\.mdx$' || true)"
rc=0

# 1) Phrases temporelles relatives (content-integrity Rule 1)
PATTERNS="scripts/content-lint/temporal-patterns.txt"
if [ -n "$CHANGED_MDX" ] && [ -s "$PATTERNS" ]; then
  PCLEAN="$(grep -v '^#' "$PATTERNS" | grep -v '^[[:space:]]*$')"
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    matches="$(grep -n -E -f <(printf '%s\n' "$PCLEAN") "$f" | grep -v ':[[:space:]]*url:' || true)"
    if [ -n "$matches" ]; then
      echo "❌ phrase temporelle interdite (Rule 1) — $f"
      printf '%s\n' "$matches" | sed 's/^/     /'
      rc=1
    fi
  done < <(printf '%s\n' "$CHANGED_MDX")
fi

# 2) Sources vides (sources: []) dans les collections sourcées
if [ -n "$CHANGED_MDX" ]; then
  while IFS= read -r f; do
    case "$f" in
      content/domain-cards/*|content/dossiers/*|content/sector-cards/*|content/solution-cards/*|content/comparison-cards/*) ;;
      *) continue ;;
    esac
    [ -f "$f" ] || continue
    fm="$(awk 'NR==1{if(/^---$/) y=1; next} y && /^---$/{exit} y{print}' "$f")"
    if printf '%s\n' "$fm" | grep -qE 'sources:[[:space:]]*\[\]'; then
      echo "❌ sources vides (sources: []) — $f"
      rc=1
    fi
  done < <(printf '%s\n' "$CHANGED_MDX")
fi

# 3) Pagefind freshness : contenu indexable modifié => public/pagefind/ doit l'être aussi
CONTENT_T="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^(content/|messages/[^/]+\.json$|velite\.config\.ts$)' | grep -v '^content/digest/__fixtures__/' || true)"
PF_T="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^public/pagefind/' || true)"
if [ -n "$CONTENT_T" ] && [ -z "$PF_T" ]; then
  echo "❌ Pagefind : contenu indexable modifié sans rebuild de public/pagefind/."
  echo "     → rm -rf public/pagefind/ && npm run build && git add public/pagefind/"
  rc=1
fi

if [ "$rc" != 0 ]; then
  echo ""
  echo "preflight a bloqué le push. Corrige les points ci-dessus,"
  echo "ou bypass ponctuel : SKIP_PREFLIGHT=1 git push   (ou git push --no-verify)"
else
  echo "preflight: OK (content-lint + pagefind)"
fi
exit "$rc"
