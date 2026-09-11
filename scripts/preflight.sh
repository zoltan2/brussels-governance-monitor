#!/usr/bin/env bash
# Garde-fou local AVANT push. Miroir de deux checks CI qui, sinon, ne tombent
# qu'après coup (et restent rouges sur main) :
#   - Content Lint     (.github/workflows/content-lint.yml) : phrases temporelles + sources vides
#   - Pagefind freshness (.github/workflows/pagefind-freshness.yml) : index régénéré avec le contenu
#
# Les checks éditoriaux ne sont PLUS réimplémentés ici : ils viennent de
# scripts/content-lint/lib.sh, source unique partagée avec la CI. Une garde
# recopiée par fichier finit toujours par diverger de son original.
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

# shellcheck source=scripts/content-lint/lib.sh
. "$ROOT/scripts/content-lint/lib.sh"

BASE="${PREFLIGHT_BASE:-origin/main}"
git rev-parse --verify -q "$BASE" >/dev/null 2>&1 || { echo "preflight: base '$BASE' introuvable (git fetch ?) — skip"; exit 0; }

RANGE="${BASE}...HEAD"
CHANGED_ALL="$(git diff --name-only "$RANGE" 2>/dev/null || true)"
[ -z "$CHANGED_ALL" ] && { echo "preflight: aucun changement vs $BASE — OK"; exit 0; }

CHANGED_MDX="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^content/.*\.mdx$' || true)"
CHANGED_QUIZ="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^public/quiz-data-.*\.json$' || true)"
rc=0

# 0) Pools de quiz : mêmes règles éditoriales que les fiches (ils vivent hors
#    de content/, donc le content lint ne les voit pas).
if [ -n "$CHANGED_QUIZ" ]; then
  if ! npx tsx scripts/quiz-lint.ts; then
    echo "❌ quiz-lint a trouvé des erreurs bloquantes"
    rc=1
  fi
fi

# 1) Phrases temporelles relatives (content-integrity Rule 1)
# 2) Sources vides (sources: []) dans les collections sourcées
#    Les deux viennent du module partagé : même code que la CI, au caractère près.
#    check_temporal échoue FERMÉ si temporal-patterns.txt est absent ou vide,
#    là où la copie locale précédente se contentait de sauter le check.
if [ -n "$CHANGED_MDX" ]; then
  printf '%s\n' "$CHANGED_MDX" | check_temporal      || rc=1
  printf '%s\n' "$CHANGED_MDX" | check_empty_sources || rc=1
fi

# 2 bis) FAQ relue sur les fiches republiées, et questions uniques. Même module
#    que la CI (scripts/content-lint/faq-check.ts). SKIP_FAQ_REVIEW=1 suspend la
#    relecture, jamais l'unicité.
if [ -n "$CHANGED_MDX" ]; then
  _faq_list="$(mktemp)"
  printf '%s\n' "$CHANGED_MDX" > "$_faq_list"
  npx tsx scripts/content-lint/faq-check.ts "$_faq_list" || rc=1
  rm -f "$_faq_list"
fi

# 2 ter) Liens internes sur le segment de route de leur langue, sur tout le
#    dépôt (hors archives du digest). Relancé aussi quand la table de routage
#    change. Même module que la CI.
if [ -n "$CHANGED_MDX" ] || printf '%s\n' "$CHANGED_ALL" | grep -q '^src/i18n/routing\.ts$'; then
  npx tsx scripts/content-lint/internal-links.ts || rc=1
fi

# 3) Pagefind freshness : contenu indexable modifié => public/pagefind/ doit l'être aussi
CONTENT_T="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^(content/|messages/[^/]+\.json$|velite\.config\.ts$)' | grep -v '^content/digest/__fixtures__/' || true)"
PF_T="$(printf '%s\n' "$CHANGED_ALL" | grep -E '^public/pagefind/' || true)"
if [ -n "$CONTENT_T" ] && [ -z "$PF_T" ]; then
  echo "❌ Pagefind : contenu indexable modifié sans rebuild de public/pagefind/."
  echo "     → npm run build && git add -A public/pagefind/   (le build retire lui-même les fichiers périmés)"
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
