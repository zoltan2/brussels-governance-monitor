# ZRU — sources de données et méthode de lecture

Investigation du 24/09/2026 (Tâche 5, A5). Ce document ne décrit pas de code : il dit comment le
script `scripts/zru/extraire.ts` (à écrire) doit lire chaque source, avec l'URL exacte, la licence
et la méthode vérifiées ce jour-là. Aucune valeur n'est inventée : tout chiffre cité ici vient d'un
appel réellement exécuté le 24/09/2026 (traces dans le scratchpad de la session, non versionnées).

## 1. Monitoring des Quartiers — indicateur 2498 (revenu équivalent médian après impôt)

### Ce qui a été cherché (Étape 1 du brief)

`https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet` répond en HTTP 200
à condition d'avoir d'abord visité `https://monitoringdesquartiers.brussels/` dans la même session
(la page pose un cookie `.AspNetCore.Culture` / `FirstLoadApp` ; sans ce premier aller, le serveur
redirige silencieusement vers l'accueil — c'est le « bouclage » observé avec un curl à une seule
requête). Deux requêtes GET suffisent, sans Playwright :

```bash
curl -c jar -b jar -L https://monitoringdesquartiers.brussels/ -o /dev/null
curl -c jar -b jar -L "https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet" -o page.html
```

La page « Fiche indicateur » (`tab=Sheet`) est rendue côté serveur (pas de JS nécessaire pour son
contenu texte) et confirme : thème « Revenus, précarité et aide sociale », échelle « Communes /
Quartiers / Secteurs », unité €, source « IBSA & Statbel (Direction générale Statistique — Statistics
Belgium) (Statistique fiscale des revenus) » (`/Source/SourceDetails/51`), 19 années disponibles
(2005 à 2023, 2023 = la plus récente). Aucun bouton d'export CSV/XLSX n'existe sur cette page (seul
un bouton « Imprimer » pour la fiche texte) : le Step 1 du brief (chercher un export officiel) est
donc négatif.

### Ce qui a été trouvé en observant le réseau (Playwright, `page.on('response')`)

La carte intégrée sur cette même page charge, sans authentification ni cookie de session, un widget
séparé sur un autre domaine :

- `map_url` (champ caché de la page indicateur) = `https://geodata.perspective.brussels/client/mdq/fr/<idDataset>`
  (pour 2498/D/2023 : `idDataset = 65707` — cet id est propre à l'indicateur, au niveau géographique
  et à l'année affichés par défaut, et est réémis par le serveur à chaque chargement de la page
  indicateur ; **il ne doit jamais être codé en dur dans le script**, seulement lu dans le HTML).
- Ce widget appelle à son tour `GET https://geodata.perspective.brussels/api/geodata/mdq/dataset/<idDataset>`
  qui rend un JSON contenant, entre autres, `entries: [{ id, value, flag }]` — une entrée par quartier
  IBSA du niveau demandé (`level: "D"` = quartiers ; `"M"` = communes ; `"S"` = secteurs).
- Les libellés des quartiers (145, id + code + nom fr/nl/en) viennent d'un second appel public :
  `GET https://geodata.perspective.brussels/api/geodata/mdq/ref/D`.

Aucun de ces deux appels ne demande de cookie, de jeton ou d'en-tête particulier : un `curl` nu les
reproduit à l'identique (vérifié le 24/09/2026, voir commandes ci-dessous). Ce sont néanmoins des
appels internes du portail cartographique (« Geodata » de perspective.brussels, `Carto-Station
2.0.12`), pas un export documenté avec un nom stable — au sens du brief, c'est le cas (b)
(« seulement un appel interne »), pas le cas (a) (fichier d'export publié à une URL de produit
stable). **Décision : (b).**

### Décision retenue : (b) — export téléchargé à la main, versionné, daté

Fichier créé : **`scripts/zru/sources/monitoring-2498.csv`** (145 lignes de données + en-tête,
point-virgule, virgule décimale) :

```
MD_ID;nom_fr;nom_nl;valeur
1;Grand Place;Grote Markt;19258,84
...
913;Parc Marie-José;Marie-Josepark;
```

- **Colonnes** : `MD_ID` (identifiant IBSA du quartier, voir jointure §1.3), `nom_fr`, `nom_nl`
  (les deux langues sont publiées par la source — aucune traduction inventée ; `en` existe aussi côté
  source mais n'est pas repris, le brief ne demandait que fr/nl), `valeur` (revenu équivalent médian
  après impôt, en euros, année 2023 — vide quand la source ne publie pas de valeur).
- **118 lignes avec valeur, 27 lignes vides** (`flag == "GM"` dans la source ; ce sont des quartiers
  non habités ou à trop faible population — bois, parcs, cimetières : Bois du Laarbeek, Scheutbos,
  Parc Marie-José, Parc Elisabeth, Forêt de Soignes, Cimetière d'Ixelles… noms lisibles dans le CSV).
  Ces 27 lignes doivent rester `null` dans les données du site, jamais 0.
- **Commande de re-génération** (à exécuter à la main pour rafraîchir ce fichier lors d'une mise à
  jour ; ne pas automatiser en CI, conformément à la contrainte globale du plan) :

  ```bash
  curl -c jar -b jar -L https://monitoringdesquartiers.brussels/ -o /dev/null
  curl -c jar -b jar -L "https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet" -o page.html
  # lire l'id dans : <input id="map_url" type="hidden" value="https://geodata.perspective.brussels/client/mdq/fr/<ID>" />
  curl "https://geodata.perspective.brussels/api/geodata/mdq/dataset/<ID>" -o dataset.json   # entries: [{id, value, flag}]
  curl "https://geodata.perspective.brussels/api/geodata/mdq/ref/D" -o refD.json             # 145 features: {id, code, name:{fr,nl,en}}
  # jointure : dataset.entries[i].id == refD.features[j].properties.id ; MD_ID = int(refD…properties.code)
  # valeur = null si entries[i].flag == "GM", sinon entries[i].value
  ```

### Provenance à écrire dans `data/`

```
producteur: "IBSA & Statbel (Direction générale Statistique – Statistics Belgium) (Statistique fiscale des revenus)"
url: "https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet"   // rejouable par le lecteur, PAS l'API interne
sourceMiseAJour: null   // la source ne publie qu'une année (2023, la plus récente de la fiche « Disponibilités », 2005 à 2023), pas une date ISO ; le millésime doit être écrit en clair dans les modifications
extraitLe: "2026-09-24"
licence: "Réutilisation libre avec mention de la source (IBSA et Statbel pour l'indicateur 2498) et des modifications"
modifications: ["donnée millésime 2023 (dernière année disponible)", "jointure MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ code du quartier (API Geodata perspective.brussels)", "27 quartiers non habités : flag GM → null"]
confiance: "official"
```

Note : tranché par la vérification des faits du 24/09/2026 (tâche 17) : le millésime 2023 est l'année
de revenus. La fiche indique désormais « En 2023 » et sa source 51 précise « (année de revenus) » ;
Statbel a publié les revenus 2023 le 19/11/2025. La légende de la carte dit « revenus 2023 ».

### 1.3 Jointure MD_ID vérifiée (145/145, exacte)

Le champ `code` de `ref/D` (ex. `"115"`, `"906"`) est **identique** à `MD_ID` de la couche WFS
`PER_A10_C1_MONITORING_QUARTIER` : comparaison ensembliste faite le 24/09/2026 sur les deux jeux de
145 identifiants distincts → égalité stricte, aucun écart dans un sens ni dans l'autre. C'est la clé
de jointure entre la géométrie (WFS, secteurs → quartiers, §2) et les valeurs (CSV versionné ci-dessus).
`dataset.entries[].id` (identifiant interne « geodata », ex. `2724`) n'est PAS `MD_ID` : il faut
toujours passer par `ref/D` pour convertir.

---

## 2. Couches WFS BruGIS (`https://gis.urban.brussels/geoserver/ows`, WFS 2.0.0)

Lues via `GetCapabilities` le 24/09/2026 (`?service=WFS&request=GetCapabilities`). Requête type :
`?service=WFS&version=2.0.0&request=GetFeature&typeNames=<Name>&outputFormat=application/json&srsName=EPSG:31370`.

| Usage | Nom exact (`typeNames`) | Vérifié le 24/09/2026 |
|---|---|---|
| Secteurs → quartiers (145 `MD_ID`, 750 secteurs) | `PERSPECTIVE_FR:PER_A10_C1_MONITORING_QUARTIER` | HTTP 200, JSON, 750 entités, 145 `MD_ID` distincts |
| ZRU 2026 | `PERSPECTIVE:A10_ZRU_2026` | HTTP 200 ; `VALIDITY_BEGIN` = 2026-09-01 (concorde avec l'arrêté du 23/07/2026, en vigueur le 01/09/2026) |
| ZRU 2020 | `PERSPECTIVE_FR:Zone_de_revitalisation_urbaine_2020` (NL : `PERSPECTIVE_NL:Zone_voor_stedelijke_herwaardering_2020`) | HTTP 200 ; `VALIDITY_BEGIN` 2020-01-01, `VALIDITY_END` 2026-08-31 |
| ZRU 2016 | `PERSPECTIVE_FR:Zone_de_revitalisation_urbaine_2016` (NL : `PERSPECTIVE_NL:Zone_voor_stedelijke_herwaardering_2016`) | HTTP 200 ; `VALIDITY_BEGIN` 2016-11-10, `VALIDITY_END` 2019-12-31 |
| **Doublon à écarter** | `PERSPECTIVE_FR:PRDD_A10_C4_ZRU_2016` (NL : `PERSPECTIVE_NL:GPDO_A10_C4_ZRU_2016_NL`) | HTTP 200, mêmes dates de validité (2016-11-10 → 2019-12-31) que la couche retenue ci-dessus : nommage historique (« PRDD »/« GPDO »), même contenu. Ne pas utiliser, prêterait à confusion sur la source active. |

Contrôles à appliquer par le client WFS gardé (`src/lib/zru/wfs.ts`, Tâche 4, déjà fait) : HTTP 200,
`content-type` JSON (une couche inconnue rend 400 + XML — vérifié en testant un nom au hasard le
24/09/2026), `numberMatched == numberReturned`, CRS `EPSG:31370` dans la réponse.

**Licence** : service CC BY 4.0 (clause `ows:Fees` du `GetCapabilities`) ; couches ZRU (2016/2020/2026) :
CC0, fiche ISO geobru-geonetwork `3171140d-b107-11f1-a6ab-b07d64b384b7` ; secteurs
`PER_A10_C1_MONITORING_QUARTIER` sans fiche ISO propre → licence du service (CC BY 4.0) pour la
géométrie, et licence Monitoring des Quartiers/Statbel (§1) pour les valeurs qui y sont rattachées.

---

## 3. Statbel

### ADI_T2 (taux de pauvreté administratif communal)

- Page : `https://statbel.fgov.be/fr/themes/datalab/revenu-disponible-administratif`
- Fichier : `https://statbel.fgov.be/sites/default/files/files/documents/DataLab/ADI/ADI_T2_STATBEL_FR.xlsx`
- Date affichée par Statbel (date de publication de la page, champ `field--name-field-publication-date`) :
  **19 novembre 2025**.
- Téléchargé et versionné le 24/09/2026 : **`scripts/zru/sources/ADI_T2_STATBEL_FR.xlsx`** (350 937
  octets, XLSX valide — `Microsoft Excel 2007+`).
- Licence : CC BY 4.0 (Statbel, spec §10).

### SILC — publication pauvreté et conditions de vie

- Page : `https://statbel.fgov.be/fr/themes/menages/pauvrete-et-conditions-de-vie/risque-de-pauvrete-ou-dexclusion-sociale`
- Fichier (nom stable, sans suffixe de version, republié à chaque mise à jour) :
  `https://statbel.fgov.be/sites/default/files/files/documents/Huishoudens/10.7%20Inkomen%20en%20levensomstandigheden/10.7.1%20Armoederisico/Publication_Silc_STATBEL_FR.xlsx`
- Date affichée par Statbel : **5 février 2026**.
- Téléchargement vérifié le 24/09/2026 (152 205 octets, XLSX valide) mais **non versionné dans ce
  commit** : le brief de cette tâche ne demandait de figer que le Monitoring des Quartiers et
  ADI_T2 ; cette URL est stable et directement récupérable par le script d'extraction (Tâche 3, déjà
  écrit) sans blocage (pas de CAPTCHA sur ces pages avec un en-tête `User-Agent` de navigateur —
  seule la recherche plein texte du site déclenche parfois un CAPTCHA, pas ces pages de thème).
- Licence : CC BY 4.0 (Statbel, spec §10).

---

## 4. Eurostat (API JSON-stat, `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<id>`)

| Jeu | URL vérifiée le 24/09/2026 | `updated` renvoyé |
|---|---|---|
| `ilc_li41` (taux de risque de pauvreté par région) | `.../data/ilc_li41?format=JSON&geo=BE10` | `2026-09-17T23:00:00+0200` |
| `ilc_peps11n` (risque de pauvreté ou d'exclusion sociale) | `.../data/ilc_peps11n?format=JSON&geo=BE10` | `2026-07-08T23:00:00+0200` |

Décodage : `src/lib/zru/eurostat.ts` (Tâche 2, déjà fait), lecture par index de dimension, valeur
absente = `null`. Licence : réutilisation autorisée avec mention de la source et des modifications
(Décision de la Commission du 12/12/2011, spec §10).

---

## 5. Récapitulatif des licences (règle commune, spec §10)

Chaque jeu ci-dessus doit porter dans `data/` : producteur, URL publique rejouable par le lecteur
(jamais un appel interne type POST/API non documentée), date de mise à jour de la source, date
d'extraction, licence, modifications. Détail par source :

| Source | Licence |
|---|---|
| BruGIS WFS (service) | CC BY 4.0 |
| Couches ZRU 2016/2020/2026 | CC0 (fiche ISO `3171140d-b107-11f1-a6ab-b07d64b384b7`) |
| `PER_A10_C1_MONITORING_QUARTIER` (géométrie) | CC BY 4.0 (service) |
| Monitoring des Quartiers (indicateur 2498) | Réutilisation libre, citer IBSA et Statbel, signaler les modifications |
| Statbel (ADI_T2, SILC) | CC BY 4.0 |
| Eurostat (`ilc_li41`, `ilc_peps11n`) | Réutilisation autorisée, mention de la source et des modifications |

---

## 6. Fichiers créés par cette tâche

- `scripts/zru/SOURCES.md` (ce fichier)
- `scripts/zru/sources/monitoring-2498.csv` — 145 quartiers, `MD_ID;nom_fr;nom_nl;valeur`, 27 valeurs
  vides (quartiers non habités), extrait le 24/09/2026
- `scripts/zru/sources/ADI_T2_STATBEL_FR.xlsx` — extrait le 24/09/2026, source datée du 19/11/2025

Aucun code du site n'est écrit par cette tâche (conforme au brief).
