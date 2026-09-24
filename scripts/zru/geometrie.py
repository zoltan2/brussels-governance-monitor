# scripts/zru/geometrie.py
# Étape ponctuelle, hors CI : télécharge les couches BruGIS (Lambert 72), simplifie en
# topologie partagée et écrit src/components/dossiers/zru/data/geometrie.ts.
# Usage : /tmp/zru-venv/bin/python scripts/zru/geometrie.py [--date AAAA-MM-JJ]
import json, sys, hashlib, datetime, urllib.request, urllib.parse
from shapely.geometry import shape
from shapely import coverage_simplify, union_all

WFS = 'https://gis.urban.brussels/geoserver/ows'
COUCHES = {  # noms exacts vérifiés dans scripts/zru/SOURCES.md (Tâche 5)
  'secteurs': 'PERSPECTIVE_FR:PER_A10_C1_MONITORING_QUARTIER',
  'zru2020': 'PERSPECTIVE_FR:Zone_de_revitalisation_urbaine_2020',
  'zru2026': 'PERSPECTIVE:A10_ZRU_2026',
}
TOL = 25  # mètres ; ≈ 1 px à 640 px de large
LARGEUR = 640

def lire(tn):
    q = urllib.parse.urlencode({'service':'WFS','version':'2.0.0','request':'GetFeature','typeNames':tn,'outputFormat':'application/json','srsName':'EPSG:31370'})
    with urllib.request.urlopen(f'{WFS}?{q}', timeout=120) as r:
        if r.status != 200: sys.exit(f'WFS {tn} : HTTP {r.status}')
        brut = r.read()
    try: j = json.loads(brut)
    except ValueError: sys.exit(f'WFS {tn} : réponse non JSON')
    if j.get('numberMatched') not in (None, j.get('numberReturned')): sys.exit(f'WFS {tn} : réponse tronquée')
    if '31370' not in str(j.get('crs')): sys.exit(f'WFS {tn} : CRS inattendu {j.get("crs")}')
    return j, hashlib.sha256(brut).hexdigest()[:16]

sect, h1 = lire(COUCHES['secteurs']); z20, h2 = lire(COUCHES['zru2020']); z26, h3 = lire(COUCHES['zru2026'])
geoms = [shape(f['geometry']) for f in sect['features']]
props = [f['properties'] for f in sect['features']]
simp = list(coverage_simplify(geoms, TOL))  # topologie partagée : pas de fentes entre voisins
region = union_all(simp)
minx, miny, maxx, maxy = region.bounds
k = LARGEUR / (maxx - minx); H = round((maxy - miny) * k)

def chemin(g):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            pts = [(round((x - minx) * k), round((maxy - y) * k)) for x, y in ring.coords]  # Y inversé
            ded = [pts[0]] + [q for a, q in zip(pts, pts[1:]) if q != a]
            out.append('M' + 'L'.join(f'{x} {y}' for x, y in ded) + 'Z')
    return ''.join(out)

par_md = {}
for g, p in zip(simp, props): par_md.setdefault(int(p['MD_ID']), []).append(g)
if len(par_md) != 145: sys.exit(f'{len(par_md)} MD_ID au lieu de 145')
quartiers = [{'mdId': m, 'd': chemin(union_all(gs))} for m, gs in sorted(par_md.items())]

zru20 = union_all([shape(f['geometry']) for f in z20['features']])
zru26 = union_all([shape(f['geometry']) for f in z26['features']])
def cle(p, i): return f"{p['MU_NATIONAL_CODE']}-{p['SD_SDDC']}"  # SD_SDDC seul n'est pas unique
def dans(g, z): return g.intersection(z).area > 0.5 * g.area
entrants_bruts = [(cle(p, i), chemin(g)) for i, (g, p) in enumerate(zip(simp, props)) if dans(g, zru26) and not dans(g, zru20)]
sortants_bruts = [(cle(p, i), chemin(g)) for i, (g, p) in enumerate(zip(simp, props)) if dans(g, zru20) and not dans(g, zru26)]

def deduplique(items):
    vus = {}
    out = []
    for cle_, d in items:
        vus[cle_] = vus.get(cle_, 0) + 1
        id_final = cle_ if vus[cle_] == 1 else f'{cle_}#{vus[cle_]}'
        out.append({'id': id_final, 'd': d})
    return out, {k: n for k, n in vus.items() if n > 1}

entrants, dup_e = deduplique(entrants_bruts)
sortants, dup_s = deduplique(sortants_bruts)
if dup_e or dup_s:
    print('clés composées dupliquées, index ajouté :', dict(dup_e), dict(dup_s), file=sys.stderr)

date = sys.argv[sys.argv.index('--date') + 1] if '--date' in sys.argv else datetime.date.today().isoformat()
# Textes montrés au lecteur : les quatre langues (Provenance.producteur/licence/modifications).
# Les empreintes des réponses WFS vont dans un commentaire et une constante non rendue, jamais
# dans les modifications affichées. Vérifié le 24/09/2026 (Tâche 17) : la surface 2020 calculée
# ici (30,68 km²) est EXACTEMENT l'attribut AREA officiel de la couche WFS ZRU 2020
# ('AREA': 30678858.94 m²) ; la surface 2026 et les secteurs entrants/sortants restent, eux, un
# calcul BGM (recouvrement majoritaire, fonction dans()), sans équivalent officiel, d'où la
# confiance « estimated » gardée pour l'ensemble (le type Provenance ne distingue pas les champs).
METHODE = {
  'fr': "surface 2020 (30,68\u00a0km²)\u00a0: attribut AREA officiel de la couche WFS ZRU 2020\u00a0; surface 2026 (27,82\u00a0km²) et secteurs entrants/sortants\u00a0: calcul BGM (recouvrement majoritaire des entités du Monitoring sur les contours WFS), sans équivalent officiel, à distinguer des 27,7\u00a0km² publiés par perspective.brussels (secteurs complets seulement)",
  'nl': 'oppervlakte 2020 (30,68 km²): officieel AREA-attribuut van de WFS-laag ZSH 2020; oppervlakte 2026 (27,82 km²) en de instromende/uitstromende sectoren: berekening BGM (meerderheidsoverlapping van de entiteiten van de Wijkmonitoring met de WFS-grenzen), zonder officieel equivalent, te onderscheiden van de 27,7 km² die perspective.brussels publiceert (enkel volledige sectoren)',
  'en': '2020 area (30.68 km²): official AREA attribute of the ZRU 2020 WFS layer; 2026 area (27.82 km²) and the entering/leaving sectors: BGM calculation (majority-area overlap of the Monitoring entities with the WFS outlines), with no official equivalent, to be distinguished from the 27.7 km² published by perspective.brussels (complete sectors only)',
  'de': 'Fläche 2020 (30,68 km²): amtliches AREA-Attribut der WFS-Schicht ZRU 2020; Fläche 2026 (27,82 km²) und die ein-/austretenden Sektoren: Berechnung BGM (Mehrheitsüberlappung der Einheiten des Quartiersmonitorings mit den WFS-Umrissen), ohne amtliches Äquivalent, zu unterscheiden von den 27,7 km², die perspective.brussels veröffentlicht (nur vollständige Sektoren)',
}
prov = {'producteur': {l: 'urban.brussels (BruGIS) & perspective.brussels (ZRU)' for l in ('fr', 'nl', 'en', 'de')},
        'url': 'https://gis.urban.brussels/geoserver/ows?service=WFS&request=GetCapabilities',
        'sourceMiseAJour': None, 'extraitLe': date,
        'licence': {'fr': 'CC BY 4.0 (service BruGIS)\u00a0; CC0 (couches ZRU)', 'nl': 'CC BY 4.0 (BruGIS-dienst); CC0 (ZSH-lagen)',
                    'en': 'CC BY 4.0 (BruGIS service); CC0 (zone layers)', 'de': 'CC BY 4.0 (BruGIS-Dienst); CC0 (Zonen-Layer)'},
        'modifications': {
          'fr': [f'simplification en topologie partagée, tolérance {TOL}\u00a0m', 'quartiers reconstitués par fusion des secteurs statistiques', METHODE['fr']],
          'nl': [f'vereenvoudiging met gedeelde topologie, tolerantie {TOL} m', 'wijken samengesteld door samenvoeging van de statistische sectoren', METHODE['nl']],
          'en': [f'simplified with shared topology, {TOL} m tolerance', 'neighbourhoods rebuilt by merging statistical sectors', METHODE['en']],
          'de': [f'Vereinfachung mit gemeinsamer Topologie, Toleranz {TOL} m', 'Viertel durch Zusammenlegung der statistischen Sektoren gebildet', METHODE['de']],
        },
        'confiance': 'estimated'}
empreintes = [h1, h2, h3]
ts = f'''// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Généré par scripts/zru/geometrie.py le {date}. Ne pas modifier à la main.
// Empreintes SHA-256 (16 premiers caractères) des réponses WFS secteurs, ZRU 2020, ZRU 2026 : {' '.join(empreintes)}.
import type {{ Provenance }} from './types';

export const VIEWBOX = '0 0 {LARGEUR} {H}';
export const QUARTIERS: {{ mdId: number; d: string }}[] = {json.dumps(quartiers)};
export const CONTOUR_REGION = {json.dumps(chemin(region))};
export const ZRU_2020 = {json.dumps(chemin(zru20.simplify(TOL)))};
export const ZRU_2026 = {json.dumps(chemin(zru26.simplify(TOL)))};
export const SECTEURS_ENTRANTS: {{ id: string; d: string }}[] = {json.dumps(entrants)};
export const SECTEURS_SORTANTS: {{ id: string; d: string }}[] = {json.dumps(sortants)};
export const SURFACES_KM2 = {{ zru2020: {round(zru20.area/1e6, 2)}, zru2026: {round(zru26.area/1e6, 2)} }};
export const PROVENANCE_GEOMETRIE: Provenance = {json.dumps(prov, ensure_ascii=False)};
/** Empreintes des réponses WFS (secteurs, ZRU 2020, ZRU 2026) : traçabilité, jamais rendues. */
export const EMPREINTES_SOURCES_GEOMETRIE = {json.dumps(empreintes)};
'''
open('src/components/dossiers/zru/data/geometrie.ts', 'w', encoding='utf-8').write(ts)
print('ok', len(quartiers), 'quartiers,', len(entrants), 'entrants,', len(sortants), 'sortants')
