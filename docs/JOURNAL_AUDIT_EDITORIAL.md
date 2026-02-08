# BGM — Journal d'audit éditorial

*Document interne — Advice That SRL*
*Version 1.0 — 7 février 2026*

---

## Objectif

Ce journal documente chaque décision éditoriale significative : publications, corrections, rétractations, rejets de sources, et créations de cartes. Il constitue la mémoire décisionnelle de BGM, indépendante de l'historique Git.

Git enregistre *quoi* a changé et *quand*. Ce journal enregistre *pourquoi*.

---

## Format

Chaque entrée suit la structure suivante :

```
## [DATE] — [TYPE] — [TITRE COURT]

**Décision** : [Ce qui a été décidé]
**Justification** : [Pourquoi cette décision]
**Sources consultées** : [Quelles sources ont informé la décision]
**Cartes affectées** : [Quelles cartes sont concernées]
**Validé par** : [Nom de l'éditeur responsable]
**Sensibilité** : standard | élevée
```

### Types d'entrées

| Type | Quand l'utiliser |
|------|-----------------|
| `PUBLICATION` | Nouvel événement publié |
| `VERIFICATION` | Vérification d'une carte (changement ou absence de changement) |
| `CORRECTION-MINEURE` | Coquille, reformulation sans impact sur le sens |
| `CORRECTION-SUBSTANTIELLE` | Erreur factuelle, chiffre incorrect, attribution erronée |
| `RETRACTATION` | Événement entier retiré (resté visible comme rétracté) |
| `REJET` | Source ou fait jugé non publiable, avec motif |
| `CREATION-CARTE` | Nouvelle carte ajoutée au suivi |
| `MODIFICATION-CHARTE` | Changement de la charte éditoriale |
| `DECISION-EDITORIALE` | Toute autre décision significative |

---

## Journal

### Entrées antérieures au journal (reconstitution)

> Les entrées ci-dessous sont une reconstitution rétrospective des décisions prises avant la création de ce journal. Elles sont documentées de mémoire et peuvent être incomplètes.

## 2026-01-XX — CREATION-CARTE — Cartes domaines initiales

**Décision** : Création de 4 cartes-domaines : Budget, Mobilité, Emploi, Logement
**Justification** : Domaines identifiés comme les plus directement impactés par le non-gouvernement dans l'analyse amont (D1-D13)
**Sources consultées** : Analyse amont BGM, données institutionnelles (Actiris, STIB, Bruxelles-Logement, Cour des comptes)
**Cartes affectées** : budget, mobility, employment, housing
**Validé par** : Éditeur responsable
**Sensibilité** : standard

---

## 2026-01-XX — CREATION-CARTE — Cartes solutions initiales

**Décision** : Création de 3 cartes-solutions : Coalition classique, Gouvernement d'urgence, Nouvelles élections
**Justification** : Scénarios de sortie de crise les plus documentés dans la littérature institutionnelle et médiatique
**Sources consultées** : Analyse amont, droit constitutionnel belge, précédents (crise fédérale 2010-2011)
**Cartes affectées** : classical-coalition, emergency-government, new-elections
**Validé par** : Éditeur responsable
**Sensibilité** : élevée (touche aux scénarios politiques)

---

## 2026-02-XX — CREATION-CARTE — Cartes solutions étendues

**Décision** : Ajout de 3 cartes-solutions : Gouvernement minoritaire, Motion constructive, Gouvernement technocratique
**Justification** : Compléter l'éventail des scénarios de sortie de crise pour une couverture exhaustive
**Sources consultées** : Droit constitutionnel belge, modèle allemand (motion constructive), précédents européens (gouvernements technocratiques en Italie, Grèce)
**Cartes affectées** : minority-government, constructive-motion, technocratic-government
**Validé par** : Éditeur responsable
**Sensibilité** : élevée

---

## 2026-02-XX — CREATION-CARTE — Cartes domaines étendues

**Décision** : Ajout de 2 cartes-domaines : Climat, Social
**Justification** : Couverture des domaines environnementaux (transition énergétique, PNEC) et sociaux (CPAS, santé mentale, aide sociale) impactés par le non-gouvernement
**Sources consultées** : Bruxelles Environnement, CPAS, Iriscare, COCOM
**Cartes affectées** : climate, social
**Validé par** : Éditeur responsable
**Sensibilité** : standard

---

## 2026-02-XX — CREATION-CARTE — Cartes secteurs

**Décision** : Ajout de 3 cartes-secteurs : Associatif, Construction, Santé-Social
**Justification** : Documenter l'impact sectoriel concret de la crise au-delà des domaines de politique publique
**Sources consultées** : Fédérations sectorielles, données d'activité, témoignages de terrain (presse)
**Cartes affectées** : nonprofit, construction, health-social
**Validé par** : Éditeur responsable
**Sensibilité** : standard

---

## Entrées courantes

> À partir de cette section, chaque décision éditoriale est documentée en temps réel.

<!-- Template pour nouvelles entrées :

## YYYY-MM-DD — [TYPE] — [TITRE COURT]

**Décision** :
**Justification** :
**Sources consultées** :
**Cartes affectées** :
**Validé par** :
**Sensibilité** : standard | élevée

-->

---

## Règles de tenue

1. **Toute publication** d'événement est journalisée (même les vérifications "rien de nouveau")
2. **Tout rejet** de source est journalisé avec le motif
3. **Toute correction** est journalisée avec l'avant/après
4. Les entrées de sensibilité élevée doivent être rédigées avec soin (elles pourraient être lues par un journaliste ou un avocat)
5. Ce journal n'est pas public, mais il doit être rédigé comme s'il pouvait le devenir

---

**Dernière mise à jour** : 7 février 2026
