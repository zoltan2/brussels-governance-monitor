# ANALYSE ARCHITECTURALE PRODUIT — FEATURES AVANCÉES
## Brussels Governance Monitor — Audit critique & préparation conceptuelle

*Document rédigé en tant que Principal Product, Data & Civic Systems Architect*
*Date : 8 février 2026*

---

## DIAGNOSTIC PRÉALABLE : ÉTAT DU SYSTÈME EXISTANT

Avant d'analyser les 12 features, il est indispensable de situer BGM dans sa réalité actuelle. Le projet est nettement plus avancé que ce que l'analyse amont prévoyait :

- **6 cartes domaine** (budget, mobilité, emploi, logement, climat, social) — toutes en 4 langues
- **6 cartes solution** — toutes en 4 langues
- **11 cartes secteur** — toutes en 4 langues
- **5 cartes comparaison** — toutes en 4 langues
- **6 rounds de formation + 24 événements** — timeline structurée
- **40+ termes de glossaire**
- **4 explainers pédagogiques**
- **Schéma Velite complet** : 7 collections avec validation Zod au build

Le modèle conceptuel (Carte + Événement + Vérification, décrit dans `system-design.md`) est solide mais **partiellement implémenté**. La notion de Vérification n'existe pas encore comme collection Velite. Les événements existent (collection `formationEvents`) mais ne sont pas encore rattachés aux cartes domaine de manière structurelle dans le schéma. C'est une lacune critique pour plusieurs des features analysées ci-dessous.

**Constat structurant** : BGM a aujourd'hui un excellent modèle éditorial statique, mais il lui manque un modèle de données relationnelles entre entités. Les cartes domaine, les événements, les secteurs et les comparaisons existent en silos. La plupart des features ci-dessous exigent des liens explicites entre ces entités.

---

## FEATURE 1 : INDICE D'INERTIE INSTITUTIONNELLE

### A. Finalité civique

L'indice d'inertie vise à rendre visible, par un indicateur synthétique, le degré de paralysie institutionnelle bruxelloise à un instant donné. Le problème réel qu'il résout : le citoyen, le journaliste ou le syndicaliste n'a aucun moyen de répondre à la question "est-ce que ça va mieux ou moins bien que le mois dernier ?" sans consulter 15 sources différentes.

**Qui en a besoin et pourquoi** :
- Le citoyen (Persona Nadia) veut un signal simple : la situation empire-t-elle ?
- Le journaliste (Persona Pieter) veut un indicateur longitudinal pour ses articles
- La syndicaliste (Persona Fatima) veut un outil de plaidoyer factuel
- Le décideur veut mesurer l'urgence de manière non partisane

### B. Conditions de faisabilité

**Sources nécessaires** :
- Parlement bruxellois : nombre de textes votés / déposés par session (mesure d'activité législative)
- Moniteur Belge : nombre d'arrêtés régionaux publiés (mesure d'activité réglementaire)
- openbudgets.brussels : exécution budgétaire réelle vs. créditée (mesure de paralysie budgétaire)
- Formation Events existants dans BGM : statut des rounds de négociation

**Prérequis logiques** :
- Définir ce que "inertie" mesure exactement. C'est le point le plus critique. Trois options :
  1. **Inertie législative** : ratio entre textes déposés et textes votés, comparé à une législature "normale" (pré-2024). Faisable mais réducteur.
  2. **Inertie budgétaire** : écart entre le budget réel et un budget ajusté à l'inflation. Plus factuel, mieux sourcé.
  3. **Inertie composite** : combinaison de plusieurs sous-indicateurs avec pondération. Plus riche, mais la pondération est un choix éditorial déguisé en objectivité.

**Données qui doivent exister** : un historique de référence (législature 2019-2024 "normale") pour permettre la comparaison. Sans baseline, l'indice ne mesure rien.

### C. Limites & risques

**Risque majeur : la fausse objectivité.** Un indice composite donne l'impression de mesurer quelque chose de scientifique alors qu'il repose sur des choix de pondération arbitraires. Si BGM attribue 40% au budget et 20% à la mobilité, un acteur politique pourra légitimement contester ces pondérations. C'est un piège classique des indicateurs synthétiques.

**Risque de manipulation interprétative** : un indice qui "baisse" (situation qui "s'améliore") pourrait être instrumentalisé par le gouvernement sortant ("voyez, tout va bien"). Un indice qui "monte" pourrait être instrumentalisé par l'opposition. L'indicateur devient un champ de bataille politique, ce qui est contraire à la mission de BGM.

**Biais temporel** : l'inertie s'accumule de manière non linéaire. Les premiers mois d'affaires courantes ont peu d'impact visible (les budgets antérieurs financent encore). Après 12-18 mois, les effets deviennent exponentiels. Un indice linéaire ne captera pas cette dynamique.

**Cas où la feature ne doit PAS être activée** : si les composantes de l'indice ne peuvent pas toutes être sourcées à un même niveau de confiance. Un indice qui mélange une donnée "officielle" (budget) avec une donnée "estimée" (impact social) produit un faux sentiment de précision.

### D. Règles de gouvernance

- **Afficher un résultat** : uniquement si toutes les composantes sont sourcées et actualisées à moins de 30 jours
- **Afficher l'incertitude** : publier les bandes de confiance, pas juste un chiffre. "L'indice d'inertie budgétaire est de X, avec une marge d'incertitude de +/- Y en raison du décalage de publication des données d'exécution budgétaire"
- **Afficher le conflit** : si deux sources donnent des signaux contradictoires (ex. hausse de l'activité parlementaire mais baisse de l'exécution budgétaire), montrer les deux plutôt que de les fusionner
- **Se taire** : si une composante majeure est non disponible depuis plus de 60 jours, suspendre l'indice avec explication

### E. Préparation à l'implémentation future

**À définir AVANT tout code** :
- La méthodologie complète, revue par un académique ou un statisticien (idéalement ULB/VUB)
- La baseline de référence (quelle législature "normale", quels indicateurs, quelles données exactes)
- Le calendrier de mise à jour (synchronisé avec les publications des sources)
- Les conditions de suspension de l'indice

**Ce qui doit rester configurable** :
- Les poids relatifs des composantes (si indice composite)
- Les seuils d'alerte (au-delà de quel seuil l'indice est "critique")
- Les sources utilisées (pour permettre l'ajout de nouvelles sources)

**Ce qui nécessite validation humaine** :
- Chaque publication de l'indice doit être accompagnée d'un commentaire éditorial contextualisant le chiffre
- Le choix de la méthodologie est un acte éditorial, pas technique

**Verdict critique** : cette feature est séduisante mais dangereuse. Un indice mal conçu ferait plus de tort à la crédibilité de BGM qu'il n'apporterait de valeur. Je recommande de commencer par un indice mono-dimensionnel (inertie budgétaire seule, basée sur l'écart entre douzièmes provisoires et un budget ajusté à l'inflation) avant toute tentative d'indice composite. La donnée existe (openbudgets.brussels, Cour des comptes), la méthodologie est transparente, et le risque d'interprétation abusive est plus faible.

---

## FEATURE 2 : DÉTECTION DE NON-ÉVÉNEMENTS

### A. Finalité civique

Transformer le silence institutionnel en information. Dans une crise de gouvernance qui dure 600+ jours, le problème n'est pas tant ce qui se passe que **ce qui ne se passe pas**. Un conseil des ministres qui n'a pas lieu, un appel à projets qui n'est pas lancé, une convention qui n'est pas renouvelée — ce sont des non-événements qui ont un impact réel mais qui sont par nature invisibles.

C'est peut-être la feature la plus originale et la plus alignée avec la mission de BGM. Le document `system-design.md` le dit bien : "rendre le silence informatif."

**Problème réel** : quand un média ne publie rien sur la réforme du logement social, le citoyen ne sait pas si c'est parce que rien ne bouge ou parce que le média n'a pas regardé. BGM, en documentant explicitement le non-événement, crée une information inédite.

### B. Conditions de faisabilité

**Sources nécessaires** :
- **Calendriers institutionnels** : ordres du jour du Parlement bruxellois, calendrier des commissions parlementaires. Disponibles sur parlement.brussels (pas en API, mais en HTML scrapable).
- **Échéanciers légaux** : dates de renouvellement des conventions (source : CBCS, FeBISP pour le secteur associatif ; SLRB pour le logement).
- **Registre des permis** : urbanisme.irisnet.be pour les permis en attente de décision.
- **OSIRIS** : coordination des chantiers bruxellois — les chantiers planifiés mais non lancés.
- **Prévisions de publication** : dates prévues des rapports institutionnels (Cour des comptes, IBSA, Actiris).

**Prérequis logiques** :
- Un calendrier de référence : "qu'est-ce qui était censé se passer ?" Cela exige de définir des échéances attendues AVANT qu'elles ne soient manquées. Exemple : "Le rapport annuel d'Actiris est habituellement publié en mars. Si en avril il n'est pas sorti, c'est un non-événement documentable."
- Un système d'échéances programmatiques rattachées aux cartes domaine et secteur.

**Donnée qui doit être cross-référencée** : le non-événement n'existe que par contraste avec une attente. Il faut donc un registre des "choses qui devraient se passer", alimenté manuellement par l'équipe éditoriale à partir de la connaissance du cycle institutionnel bruxellois.

### C. Limites & risques

**Risque de faux positif** : qualifier de "non-événement" quelque chose qui est simplement en retard (pas bloqué). Exemple : si un rapport est publié 6 semaines en retard au lieu de 4, est-ce un non-événement ou un retard bureaucratique normal ?

**Risque d'instrumentalisation** : "BGM dit que rien ne se passe sur le logement depuis 8 mois" pourrait être lu comme une accusation ciblée vers les responsables du logement, même si BGM ne nomme personne.

**Risque de surcharge** : dans une crise prolongée, presque tout est un non-événement. Si BGM liste 200 choses qui ne se sont pas passées, l'information perd sa valeur. Il faut une hiérarchie de pertinence.

**Cas où la feature ne doit PAS être activée** : pour des processus dont le calendrier est structurellement irrégulier (ex. les négociations de coalition n'ont pas de calendrier normatif — on ne peut pas dire "le gouvernement devrait être formé depuis X mois" parce qu'il n'y a pas de délai légal).

### D. Règles de gouvernance

- **Afficher un résultat** : uniquement si l'échéance attendue est basée sur un précédent factuel ou une obligation légale ("le budget annuel doit être voté avant le 31 décembre" — article de la loi spéciale)
- **Afficher l'incertitude** : distinguer "échéance légale non respectée" (fait) de "échéance habituelle non respectée" (observation). Le premier est une violation, le second est un constat.
- **Afficher un conflit** : si une institution prétend que le processus suit son cours alors que le calendrier est dépassé, documenter les deux versions
- **Se taire** : sur les non-événements qui relèvent du processus politique normal (une négociation n'a pas de deadline normative)

### E. Préparation à l'implémentation future

**À définir AVANT tout code** :
- Le registre des échéances attendues : un document éditorial (pas technique) listant les cycles institutionnels bruxellois avec leurs dates habituelles
- La taxonomie des non-événements : légaux (échéance légale manquée), administratifs (cycle normal interrompu), opérationnels (projet planifié non lancé)
- Les seuils de déclenchement : après combien de jours de retard un non-événement est-il signalé ?

**Ce qui doit rester configurable** :
- Les échéances de référence (ajustables si les cycles institutionnels changent)
- Les seuils de gravité (délai acceptable avant signalement)

**Ce qui nécessite validation humaine** :
- Chaque non-événement publié doit être validé par l'éditeur responsable — c'est un acte éditorial plus sensible qu'un événement, car il implique un jugement sur ce qui "devrait" se passer

**Verdict** : feature fondamentale et différenciante pour BGM. Mais elle exige un travail préparatoire éditorial considérable (le registre des échéances). Je recommande de commencer par les non-événements budgétaires et législatifs (calendriers les mieux documentés et les plus incontestables) avant d'élargir aux non-événements administratifs et opérationnels.

---

## FEATURE 3 : SCORE DE VÉRIFIABILITÉ PAR CARTE

### A. Finalité civique

Rendre explicite le niveau de confiance que le lecteur peut accorder à chaque carte. Le problème réel : toutes les cartes de BGM n'ont pas le même degré de solidité factuelle. La carte Budget s'appuie sur des données de la Cour des comptes (source de rang A). La carte Social s'appuie en partie sur des estimations du CBCS (source de rang B). Le lecteur mérite de le savoir.

**Pour qui** :
- Le journaliste qui doit évaluer la fiabilité d'une donnée avant de la citer
- L'académique qui doit qualifier ses sources
- Le citoyen avisé qui veut distinguer le certain du probable

### B. Conditions de faisabilité

**Sources nécessaires** : aucune source externe supplémentaire. Le score se calcule à partir des métadonnées déjà présentes dans le schéma Velite :
- `confidenceLevel` (official / estimated / unconfirmed) — déjà présent sur les cartes domaine
- `sources` avec `url` et `accessedAt` — déjà présent
- `lastModified` — déjà présent

**Prérequis logiques** :
- Définir les critères du score. Proposition de 5 axes :
  1. **Qualité des sources** : proportion de sources de rang A vs. B vs. C
  2. **Fraîcheur** : âge de la dernière vérification
  3. **Densité de sourçage** : nombre de sources indépendantes par affirmation-clé
  4. **Vérifiabilité externe** : toutes les URLs sont-elles accessibles et fonctionnelles ?
  5. **Reproductibilité** : un tiers peut-il arriver aux mêmes conclusions en suivant les mêmes sources ?

- Le score doit être exprimé de manière qualitative, pas quantitative. Pas "7.3/10" mais "Vérification élevée / moyenne / à compléter". Un chiffre suggère une précision que la méthodologie ne peut pas soutenir.

### C. Limites & risques

**Risque d'auto-référence circulaire** : BGM évalue la fiabilité de son propre contenu. C'est un exercice d'autodiagnostic, pas un audit externe. Le risque est que le score devienne un label auto-attribué plutôt qu'une véritable mesure.

**Mitigation** : publier la méthodologie du score de manière transparente, et inviter explicitement à la contestation ("si vous estimez que notre évaluation est incorrecte, signalez-le").

**Risque de dévalorisation** : si une carte a un score "faible", cela peut être lu comme "BGM publie du contenu dont il n'est pas sûr". Tension entre transparence et crédibilité.

**Mitigation** : tourner positivement : "Vérifiabilité en cours de renforcement" avec une indication de ce qui manque ("source institutionnelle primaire en attente de publication").

**Cas où la feature ne doit PAS être activée** : sur les cartes solution, où la "vérifiabilité" n'a pas le même sens (une voie de sortie est par nature prospective, pas factuelle).

### D. Règles de gouvernance

- **Afficher le score** : toujours, sur chaque carte domaine et secteur. C'est un engagement de transparence, pas une option.
- **Ne pas afficher de score** : sur les cartes solution (prospectives) et comparaison (la méthodologie comparative a ses propres critères de validité).
- **Afficher l'incertitude** : le score lui-même est une estimation. Le dire explicitement.
- **Se taire** : jamais sur le score. S'il y a une carte, il y a un score.

### E. Préparation à l'implémentation future

**À définir AVANT tout code** :
- Les 3-5 critères du score, avec leur définition précise
- L'échelle qualitative (3 niveaux maximum : élevé / moyen / à compléter)
- La méthodologie de calcul, publiée sur la page méthodologie

**Ce qui doit rester configurable** :
- Les critères (si la conception évolue)
- Les seuils entre niveaux

**Ce qui nécessite validation humaine** :
- Le score initial de chaque carte
- Toute modification du score suite à un changement de sources

**Verdict** : feature à haute valeur, relativement peu coûteuse à implémenter car elle s'appuie sur les métadonnées existantes. Le champ `confidenceLevel` existe déjà dans le schéma Velite. Il suffit de l'enrichir avec une logique de calcul et un affichage explicite. Je recommande une mise en œuvre rapide, limitée aux cartes domaine et secteur.

---

## FEATURE 4 : AFFICHAGE EXPLICITE DES CONFLITS DE DONNÉES

### A. Finalité civique

Montrer au lecteur quand les sources se contredisent, au lieu de choisir silencieusement une version. Problème réel : dans le contexte bruxellois, les chiffres officiels sont souvent contestés ou contradictoires. Exemple : le nombre de logements sociaux en attente varie selon que la source est la SLRB (source institutionnelle) ou le RBDH (source associative). BGM doit montrer les deux plutôt que de trancher silencieusement.

### B. Conditions de faisabilité

**Sources nécessaires** : les mêmes que celles déjà utilisées par BGM, mais avec un travail éditorial supplémentaire d'identification des divergences.

**Prérequis logiques** :
- Un champ dans le schéma Velite pour marquer les points de divergence. Actuellement, le schéma `metricSchema` n'a qu'un seul champ `value` par métrique. Il faudrait un champ `alternativeValues` ou un mécanisme de multi-sourcing par métrique.
- Un modèle de présentation qui n'induit pas le lecteur à penser que "toute donnée est douteuse". Le conflit est l'exception, pas la norme.

**Données à cross-référencer** :
- SLRB vs. RBDH sur le logement social
- Actiris vs. IBSA sur le chômage (données administratives vs. enquête)
- Bruxelles Mobilité vs. STIB sur l'état des projets de transport
- openbudgets.brussels vs. rapports Cour des comptes sur l'exécution budgétaire

### C. Limites & risques

**Risque de relativisme** : si BGM montre systématiquement "voici la version A, voici la version B", le lecteur peut conclure que rien n'est fiable. C'est le piège du "bothsidesism".

**Mitigation** : BGM doit expliquer POURQUOI les chiffres diffèrent (méthodologies différentes, périmètres différents, dates différentes) et, quand c'est possible, indiquer quelle source est la plus fiable dans le contexte spécifique.

**Risque éditorial** : afficher un conflit de données entre une source gouvernementale et une source associative peut être perçu comme une mise en cause de l'institution. C'est sensible dans le contexte belge.

**Cas où la feature ne doit PAS être activée** : quand la divergence est triviale (ex. arrondi différent du même chiffre) ou quand elle résulte d'un simple décalage temporel (les données de source A sont de 2024, celles de source B de 2025).

### D. Règles de gouvernance

- **Afficher le conflit** : quand deux sources de rang A ou B donnent des chiffres significativement différents (écart > 10% ou divergence qualitative sur le statut d'un projet)
- **Afficher la résolution** : si BGM peut expliquer la divergence (méthodologie différente, périmètre différent), le dire explicitement
- **Ne pas afficher de conflit** : quand la divergence est explicable par le seul décalage temporel
- **Se taire** : quand BGM n'a pas les moyens d'expliquer la divergence. Ne pas afficher un conflit qu'on ne peut pas contextualiser.

### E. Préparation à l'implémentation future

**Verdict** : feature à haute valeur éditoriale, différenciante, et alignée avec les principes de transparence de BGM. Mais elle exige un effort éditorial significatif (identifier et documenter les divergences). Peut être implémentée progressivement, carte par carte, en commençant par les domaines où les divergences sont les plus documentées (budget, logement).

---

## FEATURE 5 : FICHE PROJET 360°

### A. Finalité civique

Créer une vue unifiée et cross-référencée autour d'un projet d'infrastructure ou de politique publique identifié. Exemple : "Métro 3" recoupe la mobilité, le budget, l'urbanisme (PAD), l'emploi (chantier), l'environnement (impact). Actuellement, ces informations sont dispersées dans différentes cartes domaine et secteur.

### B. Conditions de faisabilité

**Sources nécessaires** :
- mobilite-mobiliteit.brussels/projets : état d'avancement officiel
- urbanisme.irisnet.be : permis associés au projet
- OSIRIS : coordination des chantiers liés
- openbudgets.brussels : lignes budgétaires associées
- Parlement bruxellois : questions parlementaires mentionnant le projet
- perspective.brussels : pour les projets liés aux PAD

**Prérequis logiques critiques** :
- **ProjectID stable** : c'est le problème fondamental. Il n'existe pas d'identifiant unique inter-sources pour un projet bruxellois. Il faut créer un référentiel d'identifiants BGM propre.
- **Liens cross-collections** : le schéma Velite actuel ne permet pas de lier une carte domaine à un "projet" transversal.

### C. Limites & risques

**Risque de surestimation de la capacité de cross-référencement** : dans la réalité, les données ouvertes bruxelloises sont mal interconnectées. Il n'y a pas de "join" possible entre openbudgets.brussels et urbanisme.irisnet.be. Le cross-référencement sera largement manuel.

**Risque de granularité** : un "projet" est une notion floue. Le Métro 3 est-il un seul projet ou quatre ?

**Verdict** : feature très ambitieuse. Je recommande de commencer par **un seul projet pilote** (Métro 3 ou rénovation tunnels) pour évaluer l'effort réel avant de généraliser.

---

## FEATURE 6 : CARTE DES "PROJETS FANTÔMES"

### A. Finalité civique

Cartographier les projets annoncés mais non concrétisés. "Projet fantôme" = un projet qui a fait l'objet d'une annonce officielle mais dont la réalisation a été bloquée ou reportée indéfiniment sans annonce explicite.

### C. Limites & risques

**Risque terminologique** : le terme "projet fantôme" est éditorialisant et incompatible avec le positionnement institutionnel de BGM.

**Mitigation** : utiliser "projets sans suivi public" dans l'interface.

**Verdict** : feature très différenciante. Je recommande le terme "projets sans suivi public" et un démarrage avec les PAD (Plans d'Aménagement Directeur) dont les échéances sont les mieux documentées via perspective.brussels.

---

## FEATURE 7 : IMPACT USAGER DIRECT — STIB, TROTTOIRS, CHANTIERS

### A. Finalité civique

Relier la crise institutionnelle à l'expérience quotidienne des citoyens.

### C. Limites & risques

**Risque majeur : la fausse causalité.** BGM doit être extrêmement rigoureux sur la distinction entre les compétences régionales (impactées par la crise) et communales (non impactées directement).

**Verdict** : feature séduisante mais piège. Je recommande de limiter strictement cette feature aux impacts STIB (données disponibles, compétence régionale claire, lien causal documentable) et d'abandonner l'ambition "trottoirs et chantiers" qui mélange les niveaux de compétence.

---

## FEATURE 8 : COMPARAISONS TERRITORIALES — COMMUNES/QUARTIERS

### C. Limites & risques

**Risque fatal : données insuffisantes.** Il n'y a probablement pas assez de données infra-régionales récentes pour alimenter cette feature de manière crédible. Les données de l'IBSA Monitoring des quartiers ont 2-3 ans de retard.

**Verdict : feature prématurée.** Les données n'existent pas au niveau de granularité et de fraîcheur requis. Je recommande de NE PAS investir dans cette feature avant d'avoir confirmé la disponibilité des données.

---

## FEATURE 9 : MODE PÉDAGOGIQUE "EXPLIQUE-MOI SIMPLEMENT"

### B. Conditions de faisabilité

Les summaries FALC (`summaryFalc`) existent déjà dans le schéma Velite. Le glossaire (40+ termes) est en place. Les 4 explainers couvrent les questions fondamentales.

**Ce qui manque** : le lien automatique entre les termes du glossaire et leur apparition dans les cartes (info-bulles contextuelles), et un "parcours guidé" pour le citoyen débutant.

### C. Limites & risques

**Risque de condescendance** : "Mode découverte" ou "Introduction" est préférable à "Explique-moi simplement".

**Verdict** : feature déjà partiellement implémentée. L'effort restant est principalement UX (info-bulles contextuelles, parcours guidé). C'est une amélioration incrémentale, pas un nouveau chantier.

---

## FEATURE 10 : TIMELINE NARRATIVE AUTOMATIQUE

### C. Limites & risques

**Risque du mot "automatique"** : un récit généré automatiquement sera inévitablement mécanique. Ne pas automatiser la narration. Automatiser la STRUCTURE et laisser la narration à l'éditeur.

**Verdict** : la timeline existante est solide. L'enrichissement le plus urgent est le lien cross-collection (événements ↔ cartes domaine) plutôt que la "narrativisation automatique".

---

## FEATURE 11 : ALERTES INTELLIGENTES — ACTES, BUDGETS, STATUTS

### B. Conditions de faisabilité

Le système email de BGM existe (Resend + React Email + double opt-in). L'amélioration prioritaire est la détection automatique (polling des sources institutionnelles), pas l'intelligence de la notification. Le goulot d'étranglement reste la validation humaine, et c'est voulu.

---

## FEATURE 12 : SCÉNARIOS CONDITIONNELS SANS PRÉDICTION POLITIQUE

### A. Finalité civique

Répondre à la question "si le gouvernement est formé dans X mois, que se passe-t-il ?" sans prédire QUAND ni PAR QUI. C'est de la projection conditionnelle, pas de la prédiction.

**Verdict** : feature à haute valeur, mais exigeant une rigueur méthodologique extrême. Je recommande de commencer par un seul scénario (impact budgétaire cumulé en fonction de la durée) car c'est le plus factuel et le mieux sourcé (Cour des comptes, inflation Statbel).

---

## ARCHITECTURE CONCEPTUELLE GLOBALE

### 1. Modèle conceptuel centré sur le ProjectID

**Problème fondamental** : Bruxelles n'a pas de référentiel unique des projets publics.

**Proposition** : BGM crée son propre référentiel de projets ("BGM ProjectID") qui fonctionne comme une table de correspondance :

```
ProjectID BGM : "metro-3-nord"
├── openbudgets.brussels : [lignes budgétaires X, Y, Z]
├── urbanisme.irisnet.be : [permis A, B]
├── OSIRIS : [chantier 12345]
├── mobilite-mobiliteit.brussels : [page projet Métro 3]
├── parlement.brussels : [questions parlementaires Q1, Q2, Q3]
└── BGM cards : [domainCard:mobility, sectorCard:transport]
```

Ce référentiel est éditorial : il est constitué et maintenu par l'équipe BGM, pas généré automatiquement.

**Limites** : ce référentiel ne sera jamais exhaustif. BGM documente 10-20 projets majeurs, pas les 500+ projets régionaux en cours.

### 2. Logique de hiérarchie de vérité

1. **Légal** : texte de loi, ordonnance publiée au Moniteur, arrêt de cour. Incontestable.
2. **Administratif** : arrêté, circulaire, décision administrative publiée. Quasi-incontestable sauf recours.
3. **Budgétaire** : données de la Cour des comptes, exécution budgétaire officielle. Fiable mais avec délai.
4. **Opérationnel** : données d'agences (Actiris, STIB, SLRB). Fiable dans leur périmètre, mais méthodologies variables.
5. **Analytique** : estimations, projections, analyses (IBSA, académiques, BGM). À qualifier systématiquement.

### 3. Logique Draft → Live

**Critères de passage objectifs** :
1. Au moins une source de rang A ou B est référencée
2. Le contenu FR et NL est complet (pas de placeholder)
3. L'éditeur responsable a donné son GO explicite
4. Le score de vérifiabilité est au moins "moyen"
5. La charte éditoriale est respectée

**Évolution proposée** : le champ `draft: boolean` est binaire. Une évolution vers un statut éditorial à 4 valeurs (draft / en révision / publié / archivé) serait plus adaptée.

---

## FEUILLE DE ROUTE CONCEPTUELLE

### Phase 1 : Mobilité & Construction (3-6 mois)

**Features activables** :
- Score de vérifiabilité (Feature 3) — PRÊT
- Non-événements budgétaires et législatifs (Feature 2) — PRÊT pour échéances légales
- Projet pilote 360° (Feature 5) — PARTIELLEMENT PRÊT
- Mode pédagogique enrichi (Feature 9) — PRÊT

### Phase 2 : Urbanisme & Cross-cutting (6-12 mois)

**Features activables** :
- Conflits de données (Feature 4) — PRÊT pour budget
- Carte des projets sans suivi (Feature 6) — PARTIELLEMENT PRÊT
- Timeline enrichie cross-collection (Feature 10) — PAS PRÊT (schéma à modifier)
- Scénarios conditionnels budgétaires (Feature 12) — PRÊT si validé par un économiste

### Phase 3 : Budgets & Légalité (12-18 mois)

**Features activables** :
- Indice d'inertie budgétaire (Feature 1) — PRÊT si baseline constituée
- Alertes semi-automatiques (Feature 11) — PARTIELLEMENT PRÊT
- Comparaisons territoriales (Feature 8) — PAS PRÊT (données insuffisantes)
- Impact usager STIB (Feature 7) — PARTIELLEMENT PRÊT

---

## AVERTISSEMENTS TRANSVERSAUX

### 1. Le piège du "tout connecter"

Plusieurs features (5, 6, 7, 10) reposent sur le cross-référencement de données entre sources hétérogènes. C'est séduisant sur le papier mais le cross-référencement des données ouvertes bruxelloises est un problème structurel non résolu, même par les institutions elles-mêmes. BGM doit accepter des vues partielles plutôt que promettre des vues complètes.

### 2. Le piège de l'automatisation

L'automatisation (Features 2, 10, 11) est tentante mais chère en maintenance. Pour une équipe de 1-2 personnes, chaque automatisation doit justifier le temps qu'elle économise vs. le temps qu'elle coûte en maintenance.

### 3. Le piège du scope

Les 12 features représentent 18-24 mois de travail conceptuel et éditorial. La priorité doit être dictée par **la disponibilité des données** (pas par la désirabilité de la feature) et par **la capacité éditoriale** (pas par la capacité technique).

### 4. La question qui manque

Aucune des 12 features ne traite le problème le plus urgent de BGM aujourd'hui : **la validation externe de sa méthodologie par un tiers crédible** (académique, institution, média de référence). Avant de construire des indicateurs d'inertie ou des scénarios conditionnels, BGM a besoin qu'une entité externe dise "la méthodologie de BGM est rigoureuse". Sans cette validation, chaque nouvelle feature complexe est un château de cartes éditorial.

---

*Fin du document d'analyse — Brussels Governance Monitor*
*Rédigé avec le principe que chaque feature proposée doit pouvoir être défendue devant un journaliste sceptique, un académique exigeant, un politicien hostile, et un citoyen impatient.*
