# Décisions ontologiques — Session 2026-05-08

Décisions issues de la session d'audit ontologique du 2026-05-08.
Document complémentaire à `bgm-ops/specs/2026-05-08-ontology-formalization-audit.md`.

---

## 1. State machine EngagementStatus — état post-session

### Transitions valides

| Arc | Statut | Garde |
|-----|--------|-------|
| `declared → active` | Valide | — |
| `declared → abandoned` | Valide | — |
| `declared → contradicted` | Valide | `formal_commitment: true` |
| `active → fulfilled` | Valide | — |
| `active → partial` | Valide | — |
| `active → abandoned` | Valide | — |
| `active → contradicted` | Valide | `formal_commitment: true` |
| `partial → fulfilled` | Valide | — |
| `partial → abandoned` | Valide | — |
| `partial → contradicted` | **Suspendu** | Q14 |

### États terminaux

- `fulfilled` : terminal, aucune sortie. Un acte postérieur ne modifie pas cet état — il instancie un nouvel Engagement sur le même Claim.
- `abandoned` : terminal.
- `contradicted` : terminal.

### Définition de `contradicted`

Couvre deux cas :

1. Révocation nominative directe — acte de gouvernance qui nomme et révoque explicitement l'engagement.
2. Acte législatif ou budgétaire traçable qui rend l'exécution de l'engagement factuellement impossible, même sans nomination directe. Test opérationnel : présomption `contradicted` si l'exécution substantielle est rendue irréaliste, réfutable par documentation d'une voie de continuation. Mécanisme de déclenchement : étape explicite dans le pipeline veille (voir Q14).

`abandoned` couvre la cessation sans acte déclencheur traçable — inertie, non-suite, fin de législature silencieuse.

### Garde `formal_commitment: true`

Les engagements informels (`formal_commitment: false`) ne peuvent atteindre `contradicted`. Seul `abandoned` est disponible comme état terminal, qu'il y ait rétractation explicite ou cessation silencieuse.

**Trade-off non tranché (Q16) :** cette garde supprime la distinction éditoriale entre abandon silencieux et rétractation publique traçable pour les engagements informels — deux situations politiquement différentes. Voir Q16.

---

## 2. Questions ouvertes créées en session (Q13–Q16)

| # | Sujet | Priorité | Prérequis |
|---|---|---|---|
| Q13 | Règles de création automatique d'un Engagement contradictoire post-fulfillment — qui déclenche la création, sur quel signal | V1 | NEXT-09, NEXT-10 |
| Q14 | Critères éditoriaux `contradicted` vs `abandoned` pour tous les états depuis lesquels `contradicted` est atteignable + architecture pipeline veille : étape 2b (injection contexte engagements actifs par domaine, Option A retenue au volume actuel), point d'insertion dans `fetch-sources.ts`, gap articles sans tag domaine | V1 | NEXT-09b |
| Q15 | Friction éditoriale Actor option 3 — **Fermée.** Enforcement : Zod `.refine()` cross-champ, ~1h. Friction : 3 secondes dans le même objet JSON, négligeable. Option 3 retenue (`mandate_start/end`, sans nom nominal). | Fermée | — |
| Q16 | Trade-off expressivité vs rigueur sémantique pour `formal_commitment: false`. Options : (1) garde stricte maintenue — toute rétractation informelle = `abandoned` ; (2) split `abandoned` en `abandoned-passive` et `abandoned-explicit` — préserve la distinction sans modifier `contradicted` ; (3) supprimer la garde — `contradicted` atteignable pour tout engagement | V1 | State machine stable |

---

## 3. Corrections à appliquer au document d'audit principal

Corrections issues de la session adversariale, non encore appliquées à `bgm-ops/specs/2026-05-08-ontology-formalization-audit.md`.

- **Timestamp** : ajouter "État au 2026-05-08" en tête du document d'audit.
- **NEXT-02** : reclasser P1, bloqué sur Q2 (pas P0 comme indiqué).
- **NEXT-09b** : ajouter comme étape explicite — migration `statusHistory[]` → EngagementStatus, dépendances duales NEXT-01 (fait) + NEXT-09.
- **Q3** : sortir de la blocklist des décisions urgentes. Reste dans la spec comme comportement à confirmer avant implémentation du state machine, pas comme bloquant humain.
- **Q9** : reclasser comme décision technique autonome — pas de décision humaine requise.
- **Q4** : scinder en Q4a (noms des 5 axes Baromètre + mapping domaine→axe, bloquant NEXT-03, ~15 min) et Q4b (seuils, validation académique, format d'affichage — non bloquant, peut être itéré).
- **Exemple `fulfilled → contradicted`** : supprimer ou remplacer. `fulfilled` est terminal — un acte ultérieur contradictoire instancie un nouvel Engagement sur le même Claim, il ne modifie pas l'état terminal existant.
- **Q1** : ajouter option (c) — acteur identifié par `institution_id + mandate_start + mandate_end` sans nom nominal. Note : les trois options (a), (b), (c) comportent une dimension RGPD — l'identifiabilité indirecte sous Art. 4(1) RGPD qualifie la combinaison rôle + institution + dates de mandat comme donnée personnelle. Q15 est fermée sur ce point (option c retenue), mais Q1 doit documenter les trois options et leurs profils RGPD respectifs.
- **`document_trust_tier`** : la référence éditoriale va dans `docs/SOURCE_TIERS.md` (à créer), pas dans les 323 entrées de `source-registry.json`.
- **Référence "Q5" dans les notes de session** : remplacer par Q13 — Q5 dans la spec désigne le renommage Metric → Indicator, sans rapport avec les règles de création d'Engagement contradictoire.

---

## 4. Décisions et tâches exécutables immédiatement

### Décisions non-techniques (~15 min chacune)

Aucune de ces décisions ne requiert de code. Elles débloquent les tâches techniques ci-dessous.

1. **Q4a** — Valider les 5 noms d'axes Baromètre et le mapping domaine→axe. Débloque NEXT-03.
2. **Q1** — Choisir option A, B, ou C pour les noms d'acteurs dans le DPR Tracker. Débloque NEXT-08.
3. **Q8** — Étendre ou non le périmètre des Verifications aux dossiers et aux communes.
4. **Q12** — Modèle d'accès API : niveaux de tiers, gratuité chercheurs/journalistes, monétisation.

### Tâches techniques (Q4a requis pour NEXT-03)

1. **NEXT-03** : créer `src/lib/barometer.ts` avec le type `BarometerAxis`, la map `DOMAIN_TO_AXIS`, et les constantes configurables `STALENESS_DAYS` et `SIGNIFICANCE_THRESHOLD`. Aucune logique d'agrégation, aucune UI — référence de configuration uniquement.

2. **NEXT-05** : validation FK cross-collection pour `DossierCard.dprCommitment` et `RadarEntry.cards[]` uniquement. Périmètre restreint à ces deux champs.

### Périmètre V1 (conditionnel — backend requis)

Tout le reste est V1, conditionnel à une décision d'architecture backend : state machine formel, entités Actor / Document / Claim, pipeline veille étape 2b, Baromètre UI.
