# Analyse IA — Intégration de l'ultra-synthèse Bruxelles dans BGM

*Document de référence — Information Architecture*
*Date : 8 février 2026*

---

## A. Extraction du texte-source : 16 concepts atomiques

L'ultra-synthèse sur Bruxelles couvre 5 blocs thématiques :

### Bloc 1 — Statut politique & institutions
1. **Région à part entière** — Bruxelles = 3e Région, pas une annexe du fédéral
2. **Double majorité linguistique** — clé de voûte de la crise actuelle
3. **COCOM/GGC** — compétence bi-communautaire unique (santé, social)
4. **19 communes** — autonomie communale vs compétences régionales
5. **Parlement de 89 sièges** — groupes linguistiques FR (72) + NL (17)

### Bloc 2 — Rôle européen & international
6. **Capitale de l'UE** — siège des institutions, lobbying, diplomatie
7. **120 000+ fonctionnaires internationaux** — impact fiscal paradoxal
8. **OTAN + 4 000 organisations** — Bruxelles comme hub diplomatique

### Bloc 3 — Démographie & linguistique
9. **1,2 million d'habitants** — croissance soutenue
10. **Superdiversité linguistique** — FR dominant, NL minoritaire, 100+ langues

### Bloc 4 — Économie & emploi
11. **Paradoxe des navetteurs** — 360 000 navetteurs créent 19% du PIB, paient impôts ailleurs
12. **PIB élevé, revenus bas** — le "paradoxe bruxellois"
13. **Chômage structurel ~15%** — double de la moyenne nationale
14. **Économie tertiaire** — services, institutions, peu d'industrie

### Bloc 5 — Urbanisme & mobilité
15. **Ville dense, infrastructure vieillissante** — tunnels, prémétro, logement
16. **Good Move + Metro 3** — les deux grands projets de mobilité bloqués

---

## B. 7 tensions identifiées

| # | Tension | Concepts source | Carte BGM liée |
|---|---------|----------------|----------------|
| T1 | Riche en PIB / pauvre en revenus | 11, 12 | Explainer brussels-paradox |
| T2 | Capitale européenne / quartiers pauvres | 6, 12, 13 | Aucune carte dédiée |
| T3 | 19 communes autonomes / besoin de cohérence régionale | 4, 15 | Explainer levels-of-power |
| T4 | Majorité FR / garanties NL obligatoires | 5, 10 | Explainer government-formation |
| T5 | Navetteurs créent la richesse / ne la financent pas | 11 | Explainer brussels-paradox |
| T6 | Croissance démographique / services gelés | 9, 13 | Cards emploi, social, logement |
| T7 | COCOM bi-communautaire / bloquée sans gouvernement | 3 | Card social |

---

## C. 5 questions "Qui décide ?"

1. **Qui décide du budget régional ?** → Parlement (mais nécessite gouvernement pour proposer)
2. **Qui gère la COCOM ?** → Assemblée réunie (= tous les parlementaires FR+NL)
3. **Qui décide de Metro 3 ?** → Gouvernement régional + Beliris (fédéral)
4. **Qui finance les CPAS ?** → Fédéral (RIS) + Régional (subsides) + Communal (gestion)
5. **Qui gère le logement social ?** → SLRB (régional) + 16 SISP (local)

→ L'explainer `levels-of-power` couvre le cadre général mais les liens vers les cartes domaine manquent.

---

## D. Gaps dans l'IA actuelle

### D1 — Hubs manquants

| Hub manquant | Ce que le visiteur cherche | Pages existantes dispersées |
|-------------|--------------------------|----------------------------|
| **"Bruxelles en bref"** | Comprendre le contexte avant de lire les cartes | brussels-paradox + levels-of-power + FAQ Q1 |
| **"Bruxelles cosmopolite"** | La dimension internationale + démographique | Rien (concepts 6, 7, 8, 9, 10 non couverts) |

### D2 — Relations manquantes

Le site a ~424 fichiers MDX mais aucun lien structurel entre collections :

- Les cartes domaine ne pointent pas vers les explainers pertinents
- Les explainers ne pointent pas vers les cartes domaine qu'ils éclairent
- La FAQ ne renvoie pas vers les pages détaillées
- Le glossaire n'est pas lié contextuellement aux cartes
- La timeline ne renvoie pas aux cartes domaine impactées

### D3 — Navigation affordances manquantes

- Pas de "parcours citoyen" guidé
- Pas de "related cards" en bas des pages de détail
- Le dropdown "Comprendre" mélange 4 explainers + glossaire + FAQ sans hiérarchie
- Pas de page d'entrée pour "Comprendre"

---

## E. IA restructurée proposée

### Types de pages (taxonomie)

| Type | Rôle | Exemples actuels |
|------|------|-----------------|
| **Foundation** | Contexte fondamental, rarement mis à jour | levels-of-power, government-formation |
| **Explainer** | Éclairage pédagogique | brussels-paradox, parliament-powers |
| **Domain Card** | État vivant d'un domaine | budget, mobility, employment... |
| **Solution Card** | Voie de sortie de crise | classical-coalition, new-elections... |
| **Sector Card** | Impact sur un secteur économique | nonprofit, construction, horeca... |
| **Reference** | Outil de consultation | glossary, FAQ, data, comparisons |
| **Guide** | Mode d'emploi du site | how-to-read, methodology |

### Arborescence proposée

```
Homepage
├── [Compteur + LatestEvent + Intro citoyen]
├── Domaines (6 cards vivantes)
│   ├── /domains/budget
│   ├── /domains/mobility → related: sectors/transport, sectors/construction
│   ├── /domains/employment → related: sectors/nonprofit, sectors/horeca
│   ├── /domains/housing → related: sectors/housing-sector, sectors/construction
│   ├── /domains/climate → related: sectors/environment
│   └── /domains/social → related: sectors/health-social, sectors/nonprofit
├── Solutions (6 cards)
│   └── /solutions/{slug}
├── Comprendre (restructuré)
│   ├── Fondamentaux
│   │   ├── Bruxelles en bref (NOUVEAU) ← hub d'entrée
│   │   ├── Niveaux de pouvoir
│   │   └── Formation du gouvernement
│   ├── Éclairages
│   │   ├── Paradoxe bruxellois
│   │   ├── Pouvoirs du Parlement
│   │   └── Bruxelles cosmopolite (NOUVEAU)
│   ├── Chronologie
│   ├── Glossaire
│   └── FAQ
├── Données
│   ├── Export CSV/JSON
│   └── Comparaisons
├── Secteurs (11 cards)
│   └── /sectors/{slug}
└── À propos
    ├── Charte éditoriale
    ├── Méthodologie
    ├── Comment lire ce site
    └── Mentions légales / Confidentialité
```

---

## F. Plan de cartes — 2 nouvelles + 8 enrichissements

### F1 — NOUVELLE : "Bruxelles en bref" (`/explainers/brussels-overview`)

**Type** : Foundation
**Rôle** : Hub d'entrée pour visiteur non-bruxellois/non-initié
**Contenu** :
- Bruxelles en 5 chiffres (population, PIB, communes, langues, Parlement)
- Le double statut : Région + Capitale
- Pourquoi c'est compliqué : 6 gouvernements se chevauchent
- L'impact européen : 120 000 fonctionnaires internationaux
- Le paradoxe fiscal des navetteurs (résumé, lien vers brussels-paradox)
- Liens sortants : → levels-of-power, → government-formation, → brussels-paradox, → FAQ Q1

**Sources** : IBSA, Parlement bruxellois, Eurostat

### F2 — NOUVELLE : "Bruxelles cosmopolite" (`/explainers/brussels-cosmopolitan`)

**Type** : Explainer
**Rôle** : Couvrir concepts 6-10 (dimension internationale + démographique)
**Contenu** :
- Capitale de l'UE : institutions, lobbyistes, OTAN, organisations internationales
- Impact fiscal : fonctionnaires internationaux et exonération
- Superdiversité : 180 nationalités, 100+ langues, FR dominant
- Le statut du néerlandais : minorité linguistique protégée
- Le défi démographique : croissance, jeunesse, pression sur services
- Liens sortants : → domains/employment, → domains/social, → domains/housing

**Sources** : IBSA, Eurostat, Monitoring des quartiers, Statbel

### F3 — Enrichissements (8 pages existantes)

| Page existante | Enrichissement | Concept(s) |
|---------------|----------------|------------|
| **levels-of-power** | Ajouter "Qui décide de quoi ?" tableau compétences → institution | 3, 4, 5 |
| **brussels-paradox** | Renforcer section navetteurs avec chiffres | 11, 12 |
| **parliament-powers** | Ajouter contexte double majorité linguistique | 2, 5 |
| **government-formation** | Ajouter "pourquoi c'est plus difficile à Bruxelles" | 2, 10 |
| **domains/budget** | Ajouter lien vers brussels-paradox | 12 |
| **domains/employment** | Ajouter contexte tertiaire + navetteurs | 13, 14 |
| **domains/social** | Ajouter contexte COCOM + démographie | 3, 9 |
| **FAQ** | Ajouter Q11 "Pourquoi Bruxelles est-elle si complexe ?" | 1, 2, 3, 4 |

---

## G. Règles de liaison (Relationship Rules)

### G1 — Budget de liens par page

| Type de page | Max "Related" | Max glossaire |
|-------------|--------------|---------------|
| Domain Card | 3 cards + 2 explainers | 5 termes |
| Solution Card | 2 related domains | 3 termes |
| Explainer | 3 related cards | illimité |
| Foundation | 5 liens (hub) | illimité |
| Sector Card | 1 parent domain + 2 related | 3 termes |

### G2 — Règles anti-clutter

1. Pas de liens bidirectionnels obligatoires
2. Pas de liens vers pages de même type (sauf exception fondée)
3. Liens via composant `RelatedCards` en bas de page, pas dans le body
4. Liens glossaire via tooltips, pas hyperliens dans le texte

---

## H. Plan de navigation "Few Clicks"

### Persona Nadia (citoyenne non-initiée)
```
Homepage → "Comment lire ce site" (1 clic)
Homepage → "Bruxelles en bref" (1 clic via Comprendre)
Homepage → Carte Budget → RelatedCards → Paradoxe bruxellois (2 clics)
```

### Persona Pieter (journaliste)
```
Homepage → Carte Budget → Sources (1 clic)
Homepage → Données → Export CSV (1 clic)
Homepage → Chronologie → Événement (2 clics)
```

### Persona Fatima (syndicaliste)
```
Homepage → Carte Emploi → Sector: nonprofit (2 clics)
Homepage → Comprendre → Pouvoirs du Parlement (2 clics)
```

**Objectif** : tout contenu accessible en ≤ 3 clics depuis la homepage.

---

## I. Critères d'acceptation UX (10 tests)

| # | Critère | Test |
|---|---------|------|
| 1 | Visiteur non-belge comprend le contexte en ≤ 2 min | "Bruxelles en bref" existe et lié depuis homepage |
| 2 | Double majorité linguistique expliquée | Présente dans government-formation + glossaire |
| 3 | Paradoxe navetteurs visible | brussels-paradox + lien depuis employment |
| 4 | COCOM expliquée | Glossaire + lien depuis card social |
| 5 | Chaque domain card a ≥ 1 lien "comprendre" | RelatedCards en bas de page |
| 6 | Dropdown "Comprendre" structuré en sous-groupes | Fondamentaux / Éclairages / Outils |
| 7 | FAQ répond à "pourquoi c'est complexe ?" | Q11 ajoutée |
| 8 | Bruxelles capitale UE documenté | "Bruxelles cosmopolite" existe |
| 9 | Tout contenu accessible en ≤ 3 clics | Test personas |
| 10 | Aucun concept orphelin | 16/16 concepts rattachés à ≥ 1 page |

---

## J. Risques & Mitigation

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Scope creep | Retarde le MVP | Prioriser "Bruxelles en bref" d'abord |
| Enrichissements modifient pages stables | Régression | Edits chirurgicaux |
| Trop de liens | UX cluttered | Budget de liens strict (G1/G2) |
| Duplication de contenu | overview vs paradox | Angle unique par page |

---

## K. Ordre d'implémentation

| Étape | Action | Effort | Dépendance |
|-------|--------|--------|------------|
| 1 | Enrichir 3 explainers + FAQ Q11 | Moyen | Aucune |
| 2 | Créer "Bruxelles en bref" (4 locales) | Moyen | Aucune |
| 3 | Créer "Bruxelles cosmopolite" (4 locales) | Moyen | Aucune |
| 4 | Restructurer dropdown "Comprendre" | Léger | Étapes 2-3 |
| 5 | Composant `RelatedCards` sur domain cards | Moyen | Aucune |
| 6 | Traduire nouvelles pages EN + DE | Moyen | Étapes 2-3 |
| 7 | Enrichir 5 domain cards avec liens | Léger | Étape 5 |

**Parallélisable** : 1 + 2 + 3 + 5
**Séquentiel** : 4 après 2-3, 6 après 2-3, 7 après 5

---

*Fin de l'analyse IA — Brussels Governance Monitor*
