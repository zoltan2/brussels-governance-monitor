# BGM — Gouvernance interne

*Document interne — Advice That SRL*
*Version 1.0 — 7 février 2026*

---

## Principes fondateurs

Brussels Governance Monitor est un projet de **transparence civique non partisan**, porté par Advice That SRL. Ce document définit les rôles, les responsabilités, et les processus de décision.

---

## Rôles

### Éditeur responsable (Directeur de publication)

**Titulaire** : [Nom du responsable — Advice That SRL]

**Responsabilités** :
- Validation finale de toute publication (GO/NO GO)
- Décisions éditoriales sensibles (nouvelle carte, correction substantielle, rétractation)
- Conformité juridique (droit de réponse, RGPD, mentions légales)
- Relations externes (presse, institutions, partenaires)
- Gestion des accès et de la sécurité
- Stratégie éditoriale et priorisation du contenu

**Pouvoir de veto** : Oui, absolu sur toute publication.

### Assistant éditorial et technique (Claude)

**Rôle** : Support à la rédaction, traduction, vérification de cohérence, veille technique.

**Responsabilités** :
- Rédaction de brouillons de contenu (cartes, événements, vérifications)
- Traductions EN/DE (avec révision humaine pour NL)
- Vérification de conformité à la charte éditoriale
- Analyse et qualification des sources proposées
- Maintenance technique (accessibilité, sécurité, performance)
- Tenue de la mémoire projet (documentation, patterns, learnings)

**Limites** :
- Ne publie jamais sans validation de l'éditeur responsable
- Ne prend pas de décision éditoriale autonome sur les sujets sensibles
- Ne contacte pas d'acteurs externes
- Ne modifie pas la charte éditoriale

### Contributeurs externes (futur)

**Rôle** : Contribution ponctuelle (signalement d'erreur, suggestion de source, relecture NL).

**Processus** : Toute contribution externe passe par le sas éditorial (voir ci-dessous). Aucune contribution n'est publiée sans validation de l'éditeur responsable.

---

## Processus de décision

### Publication d'un événement standard

1. Détection d'un fait pertinent (veille ou signalement)
2. Qualification de la source (rang et niveau de confiance)
3. Rédaction du brouillon (résumé, développement, sources)
4. Vérification de conformité à la charte (neutralité, sourçage, ton)
5. **Validation par l'éditeur responsable**
6. Publication (commit + deploy)
7. Inscription au journal d'audit

### Publication d'un événement sensible

Sont considérés comme sensibles :
- Tout événement mentionnant (même indirectement) un parti politique spécifique
- Tout événement impliquant des chiffres contestables ou contestés
- Tout événement susceptible de générer une demande de droit de réponse
- Toute correction substantielle ou rétractation

Processus additionnel :
- Relecture par une seconde personne si disponible
- Documentation explicite de la justification éditoriale dans le journal d'audit
- Délai de 24h minimum entre rédaction et publication (sauf urgence)

### Création d'une nouvelle carte

1. Identification du besoin (domaine non couvert, secteur impacté)
2. Vérification que des sources suffisantes existent (minimum 2 sources de niveau A ou B)
3. Rédaction de la proposition de carte (périmètre, indicateurs clés, sources envisagées)
4. **Validation par l'éditeur responsable**
5. Rédaction FR + NL
6. Publication
7. Annonce aux abonnés (si pertinent)

### Modification de la charte éditoriale

La charte éditoriale ne peut être modifiée que par l'éditeur responsable, avec :
- Justification écrite de la modification
- Documentation de l'ancienne et de la nouvelle version
- Information publique sur la page éditoriale du site

---

## Sas éditorial (gestion des sources entrantes)

Toute source proposée (par un lecteur, un partenaire, ou identifiée en veille) passe par le processus suivant :

### Qualification

| Critère | Question | Résultat |
|---------|----------|----------|
| Identifiabilité | L'auteur/émetteur est-il identifiable ? | Oui → continue / Non → rejet |
| Rang | Source primaire, secondaire, ou tertiaire ? | Primaire ou secondaire → continue / Tertiaire seule → insuffisant |
| Niveau de confiance | A (institutionnel), B (média référence), C (conditionnel), D (non qualifié) ? | A ou B → qualifié / C → nécessite corroboration / D → rejet |
| Pertinence | Le fait concerne-t-il une carte existante ou un domaine suivi ? | Oui → continue / Non → archiver pour évaluation future |
| Fraîcheur | Le fait est-il récent et non déjà couvert ? | Oui → continue / Non → archiver |

### Décisions possibles

- **Intégrer** : la source qualifie un événement → pipeline de publication
- **Archiver** : la source est intéressante mais pas actionnable immédiatement
- **Rejeter** : la source ne respecte pas les critères → motif documenté

### Principe absolu

**Aucune source n'est intégrée sans GO explicite de l'éditeur responsable.** La vitesse ne prime jamais sur la rigueur.

---

## Transparence et redevabilité

### Envers le public
- Charte éditoriale publiée et accessible
- Méthodologie publiée et accessible
- Mentions légales conformes (éditeur responsable identifié)
- Politique de confidentialité à jour
- Corrections et rétractations visibles

### Envers les acteurs politiques
- Droit de réponse respecté conformément à la loi belge
- Aucun contact proactif avec des partis ou des élus
- Aucun financement accepté de la part de partis politiques

### Envers la communauté open source
- Code source public (AGPL v3)
- Contributions bienvenues via GitHub (issues, PR)
- Documentation suffisante pour permettre un fork

---

## Révision de ce document

Ce document est revu :
- [ ] Tous les 6 mois
- [ ] À chaque changement de rôle ou d'organisation
- [ ] À chaque incident éditorial significatif

**Dernière révision** : 7 février 2026
