#!/usr/bin/env bash
# scripts/ops/http.sh — sourcé par les workflows de sonde (smoke, régression,
# disponibilité). Aucune dépendance au-delà de curl.

# code_http <url> [options curl…] -> le code HTTP, ou 000 si la requête n'a
# jamais abouti (délai, DNS, connexion refusée).
#
# Le corps de la réponse va dans $CODE_HTTP_SORTIE s'il est défini (sinon
# /dev/null) : un second `-o` passé en option serait ignoré par curl, qui
# associe chaque -o à une URL dans l'ordre.
#
# Trois tentatives espacées de 10 s tant que la réponse est 000 ou 5xx : la
# bascule du conteneur pendant un déploiement produit des échecs isolés de
# quelques secondes (fiche feedback_hetzner_deploy_verification), et deux
# faux rouges du 28/09/2026 étaient des délais de 30 s sur une seule requête.
#
# L'ancienne forme, `HTTP=$(curl …)` au niveau de l'étape, sous `bash -e` (le
# shell des étapes GitHub) : un curl en échec (code 28 = délai dépassé) tuait
# l'étape AVANT le test « 000 », qui était donc du code mort (revue blue, P3).
# Ici, curl tourne dans le sous-shell de `$(code_http …)` et porte `|| true` :
# son échec ne tue rien, et curl écrit bien `000` avec -w quand il échoue.
code_http() {
  local url=$1 code=000 essai
  shift
  for essai in 1 2 3; do
    code=$(curl -o "${CODE_HTTP_SORTIE:-/dev/null}" -s -w "%{http_code}" --max-time 30 "$@" "$url" || true)
    case "$code" in
      000|5??) [ "$essai" -lt 3 ] && sleep "${CODE_HTTP_PAUSE:-10}" ;;
      *) break ;;
    esac
  done
  printf '%s' "$code"
}

# exiger_code <attendu> <url> [options curl…] : écrit OK ou FAIL, rend 0 ou 1.
exiger_code() {
  local attendu=$1 url=$2 code
  shift 2
  code=$(code_http "$url" "$@")
  if [ "$code" = "000" ]; then
    echo "FAIL: $url injoignable après 3 tentatives (délai, DNS ou connexion)"
    return 1
  fi
  if [ "$code" != "$attendu" ]; then
    echo "FAIL: $url a répondu $code (attendu $attendu)"
    return 1
  fi
  echo "OK: $url → $code"
}
