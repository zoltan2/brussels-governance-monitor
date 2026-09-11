#!/usr/bin/env bash
# Source unique des checks content-lint. Appelé par content-lint.yml ET preflight.
# Compatible bash 3.2 (pas de mapfile). Chaque fonction lit une liste de fichiers
# (newline) sur stdin et renvoie 1 si violation.
set -uo pipefail

CONTENT_LINT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${CONTENT_LINT_SCOPED_DIRS:=content/domain-cards content/dossiers content/sector-cards content/solution-cards content/comparison-cards}"

_in_scope() {
  # $1 = chemin fichier ; vrai si dans un dossier scopé
  local file="$1" dir
  for dir in $CONTENT_LINT_SCOPED_DIRS; do
    case "$file" in "$dir"/*) return 0;; esac
  done
  return 1
}

# Annotation GitHub Actions (::error), lue par /fr/admin pour dire pourquoi le
# contrôle a échoué (src/lib/github-pr.ts, readFailureNotes). Équivalent TS :
# scripts/content-lint/annotate.ts. Hors Actions, n'écrit rien.
gh_annotate() {
  [ "${GITHUB_ACTIONS:-}" = "true" ] || return 0
  local t="$1" m="$2"
  m="${m//%/%25}"; m="${m//$'\r'/%0D}"; m="${m//$'\n'/%0A}"
  t="${t//%/%25}"; t="${t//$'\r'/ }"; t="${t//$'\n'/ }"; t="${t//:/%3A}"; t="${t//,/%2C}"
  printf '::error title=%s::%s\n' "$t" "$m"
}

# Extrait le frontmatter YAML (entre les deux premiers ---).
_frontmatter() {
  awk 'NR==1{if(/^---$/) f=1; next} f && /^---$/{exit} f{print}' "$1"
}

check_temporal() {
  local patterns="$CONTENT_LINT_DIR/temporal-patterns.txt"
  if [ ! -s "$patterns" ]; then
    echo "ERROR: $patterns manquant ou vide — check désactivé" >&2
    return 1
  fi
  local clean; clean="$(grep -v '^#' "$patterns" | grep -v '^[[:space:]]*$')"
  local violations="" f matches _files=
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    matches="$(grep -n -E -f <(printf '%s\n' "$clean") "$f" | grep -v ':[[:space:]]*url:' || true)"
    if [ -n "$matches" ]; then
      violations="$violations\n--- $f ---\n$matches"
      _files="${_files:-}${_files:+, }$f"
    fi
  done
  if [ -n "$violations" ]; then
    echo "FAIL: phrases temporelles (content-integrity Rule 1)" >&2
    printf "%b\n" "$violations" >&2
    echo "Remplacer par des dates absolues (ex: 'avant le 15 juin 2026')." >&2
    gh_annotate "Phrase temporelle relative" "Dans ${_files:-?} : remplacer par une date absolue (ex. avant le 15 juin 2026)."
    return 1
  fi
  echo "OK: phrases temporelles"
  return 0
}

check_empty_sources() {
  local violations="" f
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    _in_scope "$f" || continue
    if _frontmatter "$f" | grep -qE 'sources:[[:space:]]*\[\]'; then
      violations="$violations\n$f"
    fi
  done
  if [ -n "$violations" ]; then
    echo "FAIL: sources vides (sources: []) :" >&2
    printf "%b\n" "$violations" >&2
    echo "Ajouter au moins une source label + url + accessedAt." >&2
    gh_annotate "Sources vides" "Fiches sans source :$(printf '%b' "$violations" | tr '\n' ' '). Ajouter au moins une source (label, url, accessedAt)."
    return 1
  fi
  echo "OK: sources non vides"
  return 0
}

check_lastmodified() {
  # $1 = base ref (ex: origin/main) ; stdin = liste de fichiers
  local base="$1" violations="" f lm_head lm_base
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    _in_scope "$f" || continue
    lm_head="$(_frontmatter "$f" | grep '^lastModified:' | head -1 | sed 's/lastModified:[[:space:]]*//' | tr -d "\"'")"
    [ -n "$lm_head" ] || continue
    lm_base="$(git show "$base:$f" 2>/dev/null | awk 'NR==1{if(/^---$/) f=1; next} f && /^---$/{exit} f{print}' | grep '^lastModified:' | head -1 | sed 's/lastModified:[[:space:]]*//' | tr -d "\"'")"
    if [ "$lm_head" = "$lm_base" ]; then
      violations="$violations\n$f (lastModified: $lm_head — inchangé)"
    fi
  done
  if [ -n "$violations" ]; then
    echo "FAIL: lastModified non mis à jour :" >&2
    printf "%b\n" "$violations" >&2
    echo "Mettre à jour lastModified à la date du jour. Correctif sans republication : label" >&2
    echo "skip-lastmodified-check posé À LA CRÉATION de la PR (après coup : fermer puis rouvrir)," >&2
    echo "ou --skip-lastmodified en local." >&2
    gh_annotate "Date de mise à jour inchangée" "lastModified inchangé :$(printf '%b' "$violations" | sed 's/ (lastModified.*//' | tr '\n' ' '). Mettre la date du jour ; correctif sans republication : label skip-lastmodified-check, puis fermer et rouvrir la PR."
    return 1
  fi
  echo "OK: lastModified à jour"
  return 0
}
