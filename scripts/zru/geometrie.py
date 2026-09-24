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
prov = {'producteur': 'urban.brussels (BruGIS) ; perspective.brussels (ZRU)', 'url': 'https://gis.urban.brussels/geoserver/ows?service=WFS&request=GetCapabilities',
        'sourceMiseAJour': None, 'extraitLe': date,
        'licence': 'CC BY 4.0 (service BruGIS) ; CC0 (couches ZRU)',
        'modifications': [f'simplification en topologie partagée, tolérance {TOL} m', 'quartiers reconstitués par fusion des secteurs statistiques', f'empreintes sources {h1} {h2} {h3}'],
        'confiance': 'official'}
ts = f'''// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Généré par scripts/zru/geometrie.py le {date}. Ne pas modifier à la main.
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
'''
open('src/components/dossiers/zru/data/geometrie.ts', 'w', encoding='utf-8').write(ts)
print('ok', len(quartiers), 'quartiers,', len(entrants), 'entrants,', len(sortants), 'sortants')
