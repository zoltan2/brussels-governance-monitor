# Brussels Governance Monitor — Analyse Amont (Discovery & Scoping)

**Nom public :** Brussels Governance Monitor
**Nom de code interne :** BTR
**Version :** 1.0 — Analyse complète
**Date :** 2026-02-06
**Statut :** Décisions verrouillées — prêt pour le développement
**Porteur :** Advice That SRL (Belgique)
**Licence :** Source-Available (tous droits réservés — Advice That SRL)

### Décisions officielles

| # | Décision | Choix |
|---|----------|-------|
| D1 | Cartes domaine MVP | 2-3 (Budget + Mobilité + Emploi si données OK) |
| D2 | Architecture contenu | Velite + Zod + MDX — extensible sans refactoring |
| D3 | Cartes solution MVP | Option B — faisabilité factuelle, pas de prescription |
| D4 | Comparaisons | V1, architecture prête dès le MVP |
| D5 | Cartes secteur | V1, 10 secteurs mappés |
| D6 | Système email | Resend + React Email + Vercel Cron. Digest hebdo auto + alertes semi-auto + newsletter manuelle |
| D7 | Langues | FR/NL/EN/DE dès le MVP (FR source, NL humaine, EN/DE IA+relecture). Extensible à N langues. Backend admin = FR uniquement |
| D8 | Structure juridique | Advice That SRL — responsable RGPD, pas d'affiliation partisane |
| D9 | Licence | Source-Available — repo public GitHub, tous droits réservés |
| D10 | Pivot si gouvernement formé | Bilan de crise + suivi engagements ("promis → tenu ?") |
| D11 | Charte éditoriale | Rédigée et publiée AVANT le lancement |
| D12 | Design | Sobre, institutionnel, data-driven. Palette neutre (gris, bleu foncé, blanc). Typo Inter/IBM Plex. |
| D13 | Domaine | À réserver (.brussels ou .be prioritaire) |

---

## 0) Cadre institutionnel du projet

### Porteur

Brussels Governance Monitor est un **projet d'intérêt général hébergé par Advice That SRL** (Belgique), société de consultance en stratégie et communication. Il n'est affilié à aucun parti politique, mouvement ou organisation partisane.

### Raison d'être durable

> Brussels Governance Monitor existe pour rendre la gouvernance bruxelloise lisible, vérifiable et compréhensible, que la crise politique dure ou non.

Le compteur de jours est un point d'entrée, pas la finalité. La valeur durable = information structurée, sourcée, multilingue, sur la gouvernance bruxelloise.

### Gouvernance éditoriale

- Charte éditoriale rédigée et publiée **avant le lancement public**
- Principes : neutralité factuelle, sources obligatoires, distinction faits/interprétations, transparence sur le financement, pas d'affiliation partisane, droit de réponse formalisé
- MVP : rédaction centralisée, process de vérification explicite (double source ou source institutionnelle unique)
- V1+ : ouverture possible à un comité éditorial ou contributeurs thématiques contrôlés

### RGPD

- Responsable de traitement : Advice That SRL
- MVP sans comptes utilisateurs, collecte minimale (email si newsletter uniquement)
- Pas de profiling, pas de tracking publicitaire
- Analytics privacy-friendly (Plausible, pas de cookies tiers)

### Code source public

- Code publié publiquement dès le lancement MVP pour transparence et auditabilité
- Licence Source-Available — tous droits réservés (Advice That SRL)
- Repo public GitHub, README clair, 2FA, branch protection, aucun secret dans le code
- Fork possible par d'autres villes/régions

### Pivot si gouvernement formé

| Scénario | Pivot |
|----------|-------|
| Gouvernement formé rapidement | Bilan chiffré de la crise (mémoire durable) + suivi des engagements ("promis → tenu ?") |
| Gouvernement formé plus tard | Transition graduelle des cartes ("bloqué" → "en cours" → "livré") |
| Blocage prolongé | BGM devient l'outil structurel de référence |

### Stratégie de lancement

- Pas de lancement public sans socle de crédibilité
- Beta fermée / soft launch avec journalistes BXL identifiés en amont
- Relais syndicaux (FGTB/CSC/CGSLB), associatifs (CBCS, IEB, FeBISP), académiques (ULB, VUB)
- Montée progressive en visibilité
- Objectif : **référence**, pas buzz

### Identité visuelle

- Logo typographique simple (pas de pictogramme)
- Palette neutre : gris, bleu foncé, blanc — **pas de rouge/vert** (connotation politique en Belgique)
- Typographie : Inter ou IBM Plex Sans — neutre, accessible, multilingue (latin + diacritiques FR/NL/DE)
- Ton : sobre, institutionnel, data-driven. Pas "startup cool", pas "ONG militante"

### Partageabilité

- Open Graph tags complets par carte (titre + résumé + image auto-générée)
- Image OG dynamique via Vercel OG Image Generation
- Boutons partage : WhatsApp (priorité BXL), X, copier le lien
- Compteur = format visuel récurrent, toujours accompagné d'un fait sourcé

### Fraîcheur du contenu

- Chaque carte affiche "Dernière vérification : [date]"
- Si > 30 jours sans vérification → bandeau "Vérification en attente"
- Cartes critiques (Budget, Mobilité) : vérification minimum 1x/mois
- Alertes monitoring automatisées (Google Alerts, polling sources)
- V1 : contributions contrôlées via PR Git par experts thématiques

### Sécurité MVP

- Validation stricte formulaires (email injection prevention, rate-limit)
- MDX compilé au build (pas d'exécution dynamique)
- Protection DDoS standard (Vercel)
- 2FA + branch protection sur le repo
- Pas de secrets dans le code (env vars Vercel)

---

## 1) Problem Framing

### Problèmes observables

1. **Paralysie institutionnelle.** Depuis les élections du 9 juin 2024, la Région de Bruxelles-Capitale fonctionne en "affaires courantes" (gouvernement Vervoort III sortant). Si toujours non résolu en février 2026, cela représente ~608 jours sans gouvernement régional de plein exercice — un record pour Bruxelles.

2. **Érosion budgétaire silencieuse.** En affaires courantes, la Région fonctionne en "douzièmes provisoires" (1/12e du budget précédent par mois). Pas de nouveau budget = pas de nouveaux investissements, et l'inflation érode la valeur réelle des dépenses existantes. À 3% d'inflation annuelle, c'est ~6% de perte réelle cumulée sur 2 ans.

3. **Projets d'infrastructure gelés.** Le Metro 3 (Nord-Sud vers Bordet), la rénovation des tunnels (Stéphanie, Loi), le Plan Good Move, les PAD (Plans d'Aménagement Directeur autour de Gare du Midi, Mediapark/Heysel) — tout ce qui nécessite une décision politique nouvelle est en pause.

4. **Opacité du coût humain.** Les impacts concrets sur les citoyens (logement social non construit, programmes d'emploi non lancés, primes rénovation non mises à jour, CPAS sous-financés) ne sont ni quantifiés ni rendus visibles.

5. **Concertation sociale bloquée.** Brupartners (conseil économique et social bruxellois) émet des avis, mais n'a aucun interlocuteur gouvernemental habilité à agir. Backlog croissant de dossiers non traités.

6. **Déficit d'information structurée.** L'info existe (parlement, Cour des comptes, IBSA, presse) mais elle est fragmentée, en PDF, bilingue sans passerelle, et inaccessible au citoyen moyen.

### Acteurs affectés

| Acteur | Impact principal |
|--------|-----------------|
| **Citoyens bruxellois** | Services dégradés, projets retardés, pas de voix sur les priorités |
| **Travailleurs / syndicats** | Concertation sociale bloquée, programmes d'emploi gelés |
| **Employeurs / indépendants** | Incertitude réglementaire, investissements retardés |
| **Journalistes** | Données éclatées, difficile de quantifier l'impact global |
| **Politiques** | Pas de visibilité sur les conséquences de l'inaction (aucun feedback loop) |
| **Associations / société civile** | Subventions gelées, planification impossible |

### Jobs to be done

| # | Job |
|---|-----|
| J1 | "Je veux comprendre concrètement ce qui est bloqué et pourquoi" |
| J2 | "Je veux savoir combien ça coûte en temps, argent, et projets perdus" |
| J3 | "Je veux suivre l'état des négociations sans devoir lire 10 sources" |
| J4 | "Je veux des faits vérifiables pour alimenter mon travail (journaliste, syndicaliste, associatif)" |
| J5 | "Je veux mesurer l'impact sur mon quartier / mon domaine (mobilité, logement, emploi)" |
| J6 | "Je veux comparer : est-ce que c'est mieux/pire ailleurs en Belgique ou en Europe ?" |
| J7 | "Je veux comprendre les options réalistes pour sortir de cette crise" |
| J8 | "Je veux savoir ce qui se passe dans MON secteur (associatif, horeca, construction...)" |

### Hypothèses à vérifier

| # | Hypothèse | Méthode de vérification |
|---|-----------|------------------------|
| H1 | Les citoyens bruxellois ne savent pas quantifier l'impact de la crise politique | Micro-trottoir / sondage en ligne (n=50+) |
| H2 | Les données nécessaires existent en open data ou sont extractibles de sources officielles | Audit technique des sources (sprint 1) |
| H3 | Un format "compteur + fiches impact" est plus engageant qu'un dashboard complexe | A/B test sur landing page |
| H4 | Les journalistes utiliseraient un outil qui agrège et structure ces données | 5 entretiens avec journalistes BX1/BRUZZ/Le Soir |
| H5 | Le bilinguisme FR/NL est un prérequis non négociable pour la crédibilité | Entretiens avec acteurs des deux communautés |
| H6 | Les syndicats et Brupartners seraient prêts à fournir des données sur les dossiers bloqués | Contact direct Brupartners + FGTB/CSC Bruxelles |
| H7 | Un gouvernement en affaires courantes ne réagira pas négativement à l'outil | Avis juridique + veille réactions politiques |
| H8 | Les utilisateurs reviennent si on leur envoie des alertes ciblées (par thème/quartier) | Mesure rétention J7 avec vs sans alertes |
| H9 | L'absence de forum/commentaires n'impacte pas négativement l'engagement | Analytics comparatif post-lancement |
| H10 | Un MVP peut être livré en 4-6 semaines avec une équipe de 1-2 devs | Estimation technique post-validation architecture |

---

## 2) Personas & Contextes d'Usage

### Persona 1 — Nadia, 34 ans, employée administrative à Ixelles

- **Profil :** Francophone, utilise son smartphone dans les transports (STIB), suit l'actu sur les réseaux sociaux mais ne lit pas la presse politique.
- **Objectif :** Comprendre pourquoi les travaux de son quartier sont à l'arrêt et si c'est lié à la crise politique.
- **Frustrations :** "La politique belge c'est trop compliqué", "Je ne sais même pas qui est responsable de quoi", "Les articles sont trop longs et partisans".
- **Moment d'usage :** 8h15 dans le tram, pause midi, dimanche soir.
- **Contrainte mobile :** Écran petit, connexion 4G inégale, max 2 minutes d'attention.

### Persona 2 — Pieter, 42 ans, journaliste data chez BRUZZ

- **Profil :** Bilingue FR/NL, habitué aux données ouvertes, cherche des angles concrets pour ses articles.
- **Objectif :** Trouver des données structurées et sourcées sur l'impact de l'absence de gouvernement pour un article hebdo.
- **Frustrations :** "Les données du Parlement bruxellois sont en PDF", "Je passe des heures à croiser les sources", "Pas d'API parlementaire".
- **Moment d'usage :** En rédaction, laptop, recherche intensive (30 min+).
- **Contrainte mobile :** Secondaire — travaille surtout sur desktop.

### Persona 3 — Fatima, 28 ans, déléguée syndicale CSC Bruxelles

- **Profil :** Francophone, milieu associatif, suit les avis de Brupartners, prépare des notes pour ses collègues.
- **Objectif :** Montrer concrètement à ses collègues quels dossiers sociaux sont bloqués faute de gouvernement.
- **Frustrations :** "Les avis de Brupartners partent dans le vide", "Impossible de chiffrer ce que le blocage coûte aux travailleurs", "Les politiques disent que rien n'est bloqué".
- **Moment d'usage :** Préparation de réunions (mardi/jeudi), partage WhatsApp avec collègues.
- **Contrainte mobile :** Doit pouvoir partager un lien avec aperçu clair (Open Graph).

### Persona 4 — Marc, 55 ans, petit entrepreneur Horeca à Saint-Gilles

- **Profil :** Francophone, pas du tout "tech", mais touché directement par les décisions régionales (permis, primes énergie, fiscalité).
- **Objectif :** Savoir si les primes de rénovation vont être mises à jour et quand.
- **Frustrations :** "Je ne comprends rien à la politique belge", "J'ai l'impression que personne ne travaille", "Les infos sont contradictoires".
- **Moment d'usage :** Le soir après le service, smartphone.
- **Contrainte mobile :** Peu patient, besoin de réponses directes, pas de jargon.

### Persona 5 — Sarah, 31 ans, chercheuse en sciences politiques à l'ULB

- **Profil :** Bilingue FR/EN, travaille sur la gouvernance multi-niveaux belge, cherche des données longitudinales.
- **Objectif :** Accéder à des données structurées et téléchargeables pour alimenter sa recherche.
- **Frustrations :** "Les données ne sont pas en format machine-readable", "Pas d'historique consolidé", "Je dois tout recompiler moi-même".
- **Moment d'usage :** Sessions de travail longues, laptop, besoin d'export CSV/JSON.
- **Contrainte mobile :** Non pertinent — desktop only.

---

## 3) User Journeys (MVP)

### Journey 1 — "Je veux comprendre ce qui est bloqué" (Nadia)

```
1. Nadia voit un post Instagram/X avec "Jour 608 sans gouvernement bruxellois"
2. Elle clique → landing page BTR avec le compteur + 3 "cartes impact" du moment
3. Elle tape sur la carte "Mobilité" → voit : Metro 3 retardé, tunnels non rénovés,
   avec source + date + explication en 3 phrases
4. Elle comprend le lien entre l'absence de gouvernement et le retard concret
5. Elle partage la carte sur WhatsApp
6. (Optionnel) Elle s'inscrit aux alertes "Mobilité" par email
```

**Critère de succès :** Temps de compréhension < 30 secondes par carte. Taux de partage > 5%.

### Journey 2 — "Je veux des données sourcées pour mon article" (Pieter)

```
1. Pieter accède à BTR depuis son laptop
2. Il navigue vers la section "Données" → vue structurée par thème
   (Budget, Législation, Infrastructure, Social)
3. Il filtre par "Budget" → voit le tableau : budget prévu vs douzièmes provisoires,
   avec écart par poste, source Cour des comptes
4. Il clique "Télécharger CSV" → obtient les données brutes avec métadonnées
   (source, date de collecte, niveau de confiance)
5. Il utilise les données dans son article, cite "Source: BTR / Cour des comptes"
```

**Critère de succès :** Données trouvées en < 3 clics. Chaque donnée a une source traçable.

### Journey 3 — "Je veux suivre les dossiers sociaux bloqués" (Fatima)

```
1. Fatima reçoit une alerte email : "Nouveau dossier bloqué : réforme Actiris"
2. Elle clique → fiche du dossier avec :
   - Résumé factuel (3 phrases)
   - Avis Brupartners (lien vers l'original)
   - Statut : "En attente de décision gouvernementale depuis [date]"
   - Impact estimé : "X demandeurs d'emploi concernés" (si donnée dispo)
3. Elle copie le lien et le partage dans son groupe WhatsApp syndical
4. Le lien génère un aperçu clair (titre + résumé + image Open Graph)
```

**Critère de succès :** De l'alerte au partage en < 60 secondes. Information factuelle sans éditorialisation.

---

## 4) Définition MVP vs V1

### Décision : démarrage avec 2-3 cartes domaine, extensible sans refactoring

L'architecture Velite (schémas Zod + collections MDX auto-découvertes) permet d'ajouter des cartes de n'importe quel type en créant un fichier — zéro changement de code.

### Taxonomie des cartes (4 types)

```
CARTE DOMAINE (vue macro)
  Ex: "Budget", "Mobilité", "Emploi"
  → résumé transversal d'un domaine complet

CARTE SECTEUR (vue détaillée, sous un domaine)
  Ex: sous "Emploi" → "Associatif", "Horeca", "Construction", "Tech"
  → mécanismes gelés/actifs, parties prenantes, impact humain

CARTE COMPARAISON (vue contextuelle)
  Ex: "BXL vs Flandre : emploi", "BXL vs Irlande du Nord : durée de crise"
  → mêmes indicateurs, mêmes sources (Eurostat/Statbel), côte à côte

CARTE SOLUTION (vue prospective)
  Ex: "Coalition classique retardée", "Gouvernement minoritaire"
  → mécanisme légal, précédent, faisabilité, délai
```

### MVP (4-6 semaines) — Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Compteur de crise** | Nombre de jours sans gouvernement + contexte factuel ("affaires courantes" expliqué simplement) |
| F2 | **2-3 cartes domaine** | Budget + Mobilité (+ Emploi si données dispo). Architecture Velite prête pour N cartes. |
| F3 | **1-2 cartes solution** | "Comment ça peut se débloquer ?" — les 2 voies les plus réalistes (coalition retardée + gouvernement d'urgence). Option B : faisabilité factuelle, pas de prescription. |
| F4 | **Système email complet** | Inscription (2 étapes, double opt-in) + choix de thèmes (Topics Resend) + digest hebdo automatique + alertes événement (semi-auto). Stack : Resend + React Email + Vercel Cron. |
| F5 | **Page Données** | Métriques-clés + export CSV avec métadonnées |
| F6 | **Multilinguisme FR/NL/EN/DE** | 4 langues publiques (FR source, NL humaine, EN/DE IA+relecture). UI next-intl, contenu MDX par locale, emails par locale. Extensible à N langues sans refactoring. Backend admin = FR uniquement. |

### V1 (3-6 mois post-MVP)

| # | Feature |
|---|---------|
| V1.1 | **Cartes secteur** — détail par secteur sous chaque domaine (Associatif, Horeca, Construction, Culture, Tech, etc.) |
| V1.2 | **Cartes comparaison** — BXL vs Flandre/Wallonie (Eurostat NUTS-2), BXL vs cas internationaux (Stormont, Espagne, Pays-Bas) |
| V1.3 | **Toutes les cartes solution** — les 6 voies de sortie documentées |
| V1.4 | **Timeline interactive** — frise chronologique (élections → formateur → échec → etc.) |
| V1.5 | **Vue par commune** — "Que se passe-t-il près de chez moi ?" |
| V1.6 | **Suivi parlementaire** — questions, votes, commissions |
| V1.7 | **Simulateur d'impact budgétaire** — "Si le budget reste gelé X mois de plus..." |
| V1.8 | **API publique** — JSON pour journalistes/chercheurs |
| V1.9 | **Résumés IA** — synthèse de rapports avec citations obligatoires |
| V1.10 | **Page "Méthodo"** — transparence totale sur sources et limites |
| V1.11 | ~~Version EN~~ → **intégré au MVP (F6)**. V1 : ajout de langues supplémentaires (ar, tr, es...) via même mécanisme |
| V1.12 | **Notifications push** (PWA) |

### Plus tard / Jamais

| Feature | Raison |
|---------|--------|
| Forum / commentaires | Risque de polarisation, modération impossible en MVP |
| Scoring / ranking de politiciens | "Name & shame" — contraire à la neutralité |
| Pétitions / votes citoyens | Hors scope — on informe, on ne mobilise pas |
| Chatbot IA | Risque d'hallucination, coût, pas de valeur ajoutée prouvée |
| Prédictions politiques | Spéculatif, non factuel |
| Comparaisons non vérifiables | Si la méthodologie source n'est pas identique = pas de comparaison |

---

## 5) Données & Sources

### F1 — Compteur de crise

| Aspect | Détail |
|--------|--------|
| **Données requises** | Date des élections (9/06/2024), date de prestation de serment du nouveau gouvernement (si applicable), statut actuel de la formation |
| **Sources** | parlement.brussels (documents officiels), Moniteur Belge (ejustice.just.fgov.be) pour les arrêtés de nomination |
| **Fréquence MAJ** | Événementielle (changement de statut : nouveau formateur, échec, accord) |
| **Niveau de confiance** | Élevé — données officielles factuelles |
| **Plan B** | Veille presse (BX1, BRUZZ, Belga) si les documents officiels tardent |
| **Traçabilité** | Lien direct vers le document officiel source pour chaque changement de statut |

### F2 — Cartes impact

| Domaine | Données requises | Source principale | Source secondaire | Fréquence | Confiance | Plan B |
|---------|-----------------|-------------------|-------------------|-----------|-----------|--------|
| **Budget** | Budget initial vs douzièmes provisoires, écart par poste | Cour des comptes (courdescomptes.be), documents budgétaires parlementaires | IBSA (ibsa.brussels), Bureau du Plan | Annuel (budget) + événementiel | Moyen-élevé — les PDF existent mais doivent être structurés | Extraction manuelle des chiffres-clés des rapports PDF |
| **Mobilité** | Statut Metro 3, tunnels, Good Move, STIB | Bruxelles Mobilité (mobilite-mobiliteit.brussels), datastore.brussels | Questions parlementaires, presse spécialisée | Trimestriel | Moyen — données projet souvent parcellaires | Monitoring presse + questions parlementaires comme proxy |
| **Logement** | Logements sociaux planifiés vs construits, primes rénovation | SLRB (Société du Logement de la Région bruxelloise), datastore.brussels | IBSA, Observatoire des loyers | Annuel | Moyen | Rapports annuels SLRB + données IBSA |
| **Emploi** | Taux de chômage BXL, programmes Actiris gelés, avis Brupartners | Actiris (actiris.brussels), Brupartners (brupartners.brussels) | IBSA, Steunpunt Werk | Mensuel (chômage), événementiel (avis) | Élevé pour le taux de chômage, moyen pour les dossiers gelés | Rapports Actiris + avis Brupartners en PDF |
| **Climat** | Objectifs climat BXL vs trajectoire, primes énergie | Bruxelles Environnement, Plan Climat régional | IBSA, données fédérales énergie | Annuel | Moyen — objectifs clairs mais suivi irrégulier | Rapports Bruxelles Environnement |
| **Social/Santé** | Financement CPAS, données COCOM/CCC | COCOM (ccc-ggc.brussels), Observatoire de la Santé et du Social | Rapports annuels CPAS, IBSA | Annuel | Moyen-faible — données fragmentées entre 19 communes | Agrégation manuelle des rapports annuels CPAS disponibles |

**Stratégie globale de traçabilité / fact-check :**
- Chaque fait affiché = 1 source minimum avec URL + date de consultation
- Badge de confiance par carte : "Donnée officielle" / "Estimation BTR (méthodologie)" / "Non confirmé"
- Page méthodologie publique (V1.9 mais le principe s'applique dès le MVP dans le footer)
- Processus de correction : si une erreur est signalée, correction sous 24h avec mention "Corrigé le [date]"
- Pas de donnée "inventée" — si on ne sait pas, on écrit "Donnée non disponible" + explication de pourquoi

### F3/F4 — Système de notifications email (analyse complète)

#### Stack technique (validé context7)

| Composant | Choix | Rôle |
|-----------|-------|------|
| **Resend** (API + dashboard) | Envoi transactionnel + Broadcasts | Contact management, Topics (préférences user), Segments (regroupements internes), envoi |
| **React Email** | Templates email | Composants React responsive (Section, Row, Column), dark mode, preview text |
| **Cron (Vercel)** | Déclencheur digest | Lundi 8h → génère et envoie le digest hebdo |

#### 4 types d'emails — taxonomie complète

| Type | Déclencheur | Fréquence | Auto ? | Contenu |
|------|-------------|-----------|--------|---------|
| **Bienvenue** | Inscription confirmée (double opt-in) | 1x | 100% auto | Confirmation + explication du service + lien préférences |
| **Digest hebdo** | Cron lundi 8h | Max 1x/semaine | 100% auto | Résumé des changements de la semaine sur les cartes suivies par l'abonné |
| **Alerte événement** | Événement politique majeur | Rare (< 1x/mois) | Semi-auto (détection auto, envoi validé par humain) | Fait majeur + impact sur les cartes concernées |
| **Newsletter éditoriale** | Décision rédactionnelle | 1-2x/mois max | Manuelle (Broadcast Resend no-code) | Analyse contextuelle, pédagogie — opt-in séparé |

**Règle anti-spam absolue :** max 1 email/semaine (digest OU alerte, jamais les deux la même semaine). Newsletter = opt-in séparé, non comptabilisée dans la limite.

#### Digest hebdo — contenu et logique

Généré automatiquement depuis le diff des cartes MDX :
- Filtre : `lastModified >= (today - 7 jours)` parmi les cartes correspondant aux Topics de l'abonné
- Si 0 carte modifiée dans ses thèmes → **pas d'envoi** (pas de "rien de neuf")
- Chaque item = titre carte + 1-2 phrases de changement + lien → ~200 mots max total
- Compteur de jours toujours visible en header
- Footer : prochaine échéance connue (ex: "Débat budgétaire au Parlement le 15/02")

**Champs MDX nécessaires sur chaque carte :**
```
lastModified: date
changeType: enum [new, updated, status-change, data-refresh]
changeSummary: { fr: string, nl: string }  → 1 phrase décrivant le changement
```

#### Alerte événement — déclencheurs

| Événement | Impact cartes | Envoi |
|-----------|--------------|-------|
| Nouveau formateur désigné | Solution "coalition" → statut "en cours" | Après validation humaine |
| Échec de formation | Solution → retour "bloqué" | Après validation humaine |
| Gouvernement formé | TOUTES les cartes | Après validation humaine |
| Vote douzièmes provisoires | Budget → mise à jour | Après validation humaine |
| Rapport Cour des comptes | Budget → nouvelles données | Après validation humaine |
| Décision majeure transport | Mobilité → mise à jour | Après validation humaine |

#### Préférences utilisateur — UX d'inscription (2 étapes)

**Étape 1 (obligatoire) :** email + langue (FR/NL)
**Étape 2 (checkboxes) :**

```
Thèmes (= Resend Topics) :
☑ Budget (douzièmes provisoires, Cour des comptes)
☑ Mobilité (Metro 3, tunnels, STIB, Good Move)
☐ Emploi (Actiris, programmes gelés, chômage)
☐ Logement (logement social, primes rénovation)
☐ Climat & Énergie (primes énergie, objectifs climat)
☐ Social & Santé (CPAS, COCOM, sans-abri)
☑ Sortie de crise (formations, négociations, solutions)

Fréquence :
◉ Digest hebdo (recommandé)
○ Digest mensuel
○ Alertes événements uniquement

☐ Newsletter BTR (1-2x/mois, analyse de fond) — opt-in séparé
```

Mapping Resend :
- Chaque thème = 1 **Topic** (visible par l'utilisateur, désactivable)
- Fréquence + langue = **tags** sur le Contact
- Segments internes : "FR-hebdo-budget", "NL-mensuel-all", etc. → utilisés pour cibler les Broadcasts

Page de préférences accessible depuis chaque email (lien dans le footer).

#### Pipeline d'information — d'où viennent les mises à jour

```
COUCHE 1 — Détection (automatisable)
├── datastore.brussels API → polling quotidien des datasets suivis
├── Moniteur Belge RSS → parsing des publications BXL
├── Statbel / Eurostat → polling mensuel des indicateurs NUTS-2
└── Google Alerts ciblés → signaux uniquement, pas de contenu

COUCHE 2 — Vérification (humaine — non négociable en MVP)
├── Signal reçu → notification interne (email admin)
├── Vérification : source officielle confirmée ?
├── Si oui → mise à jour carte MDX + git commit
│   (champs lastModified, changeType, changeSummary remplis)
└── Si non → signal archivé, aucune mise à jour

COUCHE 3 — Diffusion (automatisable)
├── Git push → rebuild Vercel
├── Cron lundi 8h : détecte les cartes modifiées cette semaine
│   → pour chaque Contact, filtre par ses Topics
│   → si ≥1 carte modifiée → génère digest → Broadcast Resend
│   → si 0 → pas d'envoi
└── Alerte événement : même pipeline, déclenché manuellement
```

#### Newsletter éditoriale (complémentaire)

| Aspect | Digest hebdo | Newsletter |
|--------|-------------|------------|
| Ton | Factuel, sec, données | Pédagogique, contextuel |
| Rédaction | Auto depuis les cartes | Humain |
| Fréquence | Hebdo (si changements) | 1-2x/mois |
| Opt-in | Par défaut | Séparé, explicite |
| Contenu type | "Carte Budget mise à jour : -3.8%" | "Pourquoi les douzièmes provisoires érodent les services : 3 mécanismes" |
| Longueur | ~200 mots | ~500-800 mots |
| Outil | Auto (cron + Resend API) | Resend Broadcast (no-code editor) |

En MVP : le digest est prioritaire. La newsletter peut démarrer manuellement via Resend dashboard sans dev supplémentaire.

#### Coûts et limites

| Aspect | MVP | Seuil |
|--------|-----|-------|
| Resend free tier | 3 000 emails/mois | 500 abonnés × 4 envois = 2 000 → OK |
| Resend Pro | 20$/mois | Nécessaire au-delà de ~750 abonnés |
| React Email | Gratuit (open source) | — |
| Templates | 3 (bienvenue, digest, alerte) | Suffisant pour le MVP |

#### RGPD

| Aspect | Approche |
|--------|----------|
| Base légale | Consentement explicite (Art. 6(1)(a)) — double opt-in |
| Désabonnement | 1 clic, géré automatiquement par Resend dans les Broadcasts |
| Données stockées | Email + langue + topics — rien d'autre. Hébergé chez Resend. |
| Droit d'accès/suppression | Via page préférences + email contact@btr.brussels |
| Transfert hors UE | Vérifier la politique Resend. Alternative EU-native : Brevo (ex-Sendinblue) |
| Privacy policy | Mentionner explicitement les emails dans la privacy policy FR/NL |

### F4 — Page Données

| Aspect | Détail |
|--------|--------|
| **Données requises** | Agrégation structurée des métriques des cartes impact + métadonnées (source, date, confiance) |
| **Format export** | CSV avec en-têtes bilingues FR/NL + fichier de métadonnées (source, licence, date) |
| **Niveau de confiance** | Variable par dataset — affiché explicitement |

### F6 — Multilinguisme FR/NL/EN/DE (+ futures langues)

| Aspect | Détail |
|--------|--------|
| **Langues MVP** | FR (source), NL, EN, DE — extensible à N langues |
| **Stack i18n** | next-intl (score context7: 89.7) — routing `/fr/`, `/nl/`, `/en/`, `/de/`, locale detection, fallback |
| **Contenu cartes** | 1 fichier MDX par langue par carte. Les données factuelles (chiffres, dates, URLs) sont identiques — seuls titre, résumé, et narratif sont traduits. |
| **UI (labels, boutons)** | 1 fichier JSON par langue (`ui/fr.json`, `ui/nl.json`, `ui/en.json`, `ui/de.json`) |
| **Emails** | 1 template React Email par type, reçoit `locale` en prop. Contenu dynamique tiré des MDX dans la bonne langue. |
| **Stratégie traduction** | FR : rédaction originale. NL : traduction humaine (crédibilité BXL). EN/DE : traduction IA + relecture humaine. Futures langues : idem EN/DE. |
| **Fallback** | Si une carte n'est pas traduite dans la langue demandée → affichage FR avec bandeau "Version française — traduction en cours" |
| **Backend admin** | FR uniquement — pas de traduction |
| **Effort par carte** | ~45 min FR + ~30 min NL + ~15 min EN + ~15 min DE = **~1h45 total** |
| **Ajouter une langue** | 1) Code dans `routing.ts` 2) `ui/xx.json` 3) `carte.xx.mdx` par carte — zéro changement de code |
| **Risque** | Qualité traduction DE (petite communauté germanophone). Mitigé par le fallback FR. |

### Cartes secteur — Mapping complet des secteurs impactés (V1)

Les secteurs ci-dessous sont documentés pour la V1. En MVP, ils alimentent le contenu des cartes domaine (ex: la carte "Emploi" mentionne l'associatif, l'horeca, etc. sans fiche dédiée par secteur).

| Secteur | Mécanismes régionaux gelés | Mécanismes qui continuent | Données d'impact | Parties prenantes clés |
|---------|---------------------------|--------------------------|-------------------|----------------------|
| **Associatif / Non-profit** (~80 000 emplois BXL) | Conventions pluriannuelles expirées non renouvelées, nouveaux agréments gelés, subsides facultatifs bloqués, appels à projets non lancés | Subsides organiques (base légale), conventions non expirées | Emploi non-marchand (IBSA), nombre de conventions en attente (unknown — à vérifier via CBCS) | CBCS, FeBISP, FdSS, UNIPSO, Bruxeo |
| **Construction / Immobilier** | PAD gelés (Gare du Midi, Heysel), nouveaux marchés publics majeurs bloqués, régie foncière gelée | Permis d'urbanisme courants (Fonctionnaire Délégué), maintenance | Permis de bâtir (Statbel), emploi construction (IBSA) | Confédération Construction BXL, UPSI, perspective.brussels |
| **Horeca / Tourisme** | Réformes fiscales gelées, nouveaux programmes de soutien bloqués, piétonnier (réformes gelées) | visit.brussels (contrat de gestion existant), événements courants | Nuitées touristiques (visit.brussels), emploi horeca (IBSA) | Fédération Horeca BXL, BHA, Comeos, UCM BXL |
| **Culture** | Infrastructure culturelle régionale (Kanal co-financement), économie créative (hub.brussels nouveaux programmes) | Compétence communautaire (FWB, VGC) continue | Fréquentation culturelle, emploi culturel (Observatoire FWB) | RAB/BKO, VGC Cultuur |
| **Santé / Social (COCOM)** | Nouveaux investissements hospitaliers bi-communautaires, programmes de prévention, politique sans-abri (structurel), santé mentale | Plans d'urgence hivernaux (urgent), Iriscare opérations courantes | Indicateurs santé (Observatoire Santé et Social), listes d'attente CPAS | Iriscare, Fédération CPAS BXL, maisons médicales |
| **Transport** | Metro 3 (nouvelles phases), Good Move (nouvelles phases), nouvelles lignes tram, réforme parking | STIB opérations courantes, maintenance tunnels, projets déjà approuvés | Fréquentation STIB, modal split (Bruxelles Mobilité) | STIB, Bruxelles Mobilité, GRACQ/Fietsersbond |
| **Tech / Innovation** | Innoviris nouveaux programmes, Smart City initiatives, stratégie IA régionale | Innoviris engagements existants, hub.brussels opérations | R&D investissement (IBSA), projets Innoviris (annual report) | Innoviris, hub.brussels, BECI, Agoria BXL |
| **Environnement / Énergie** | Nouveaux objectifs climat, expansion économie circulaire, Blue Deal (eau) | Bruxelles Environnement fonctions réglementaires, Renolution (primes existantes) | Qualité air (IRCELINE), émissions CO2, consommation énergie | Bruxelles Environnement, IEB |
| **Commerce / Retail** | Schéma développement commercial, réformes réglementaires, économie nocturne | hub.brussels soutien existant, marchés publics | Taux de vacance commerciale, emploi retail (IBSA) | Comeos, UCM BXL, SNI |
| **Logement** | Alliance Habitat (nouvelles phases), réforme allocation loyer, Code du Logement (modifications) | SLRB constructions en cours, Fonds du Logement prêts, Renolution primes existantes | Liste d'attente logement social (SLRB), prix immobilier (Statbel) | SLRB, CLT Brussels, RBDH, Fonds du Logement |

### Cartes comparaison — Sources à méthodologie identique

**Principe absolu :** on ne compare que ce qui est comparable. Chaque carte comparaison doit utiliser des données de **même méthodologie et même source**.

#### Tier 1 — Comparaisons intra-belges (gold standard)

| Indicateur | Source | Code dataset | Granularité | Fréquence | Pourquoi c'est fiable |
|-----------|--------|-------------|-------------|-----------|----------------------|
| Taux d'emploi / chômage | Statbel (LFS / Enquête forces de travail) | statbel.fgov.be | NUTS-2 (BE10=BXL, BE2=Flandre, BE3=Wallonie) | Trimestriel | Méthodologie OIT unique pour toute la Belgique |
| PIB régional | NBB Comptes régionaux | nbb.be/statistics/regional-accounts | NUTS-1 | Annuel (lag 1-2 ans) | Norme ESA 2010 |
| Confiance des entreprises | NBB Enquête de conjoncture | nbb.be | BXL, Flandre, Wallonie | **Mensuel** | Même questionnaire, même méthodologie |
| Exécution budgétaire | Cour des comptes / Rekenhof | courdescomptes.be | Chaque entité gouvernementale | Annuel | Même norme d'audit pour tous les niveaux |
| Permis de bâtir | Statbel | statbel.fgov.be | NUTS-2 | Trimestriel | Même définition, même collecte |
| Prix immobilier | Statbel | statbel.fgov.be | Région / commune | Trimestriel | Même source (notaires) |
| Pauvreté (SILC) | Statbel (EU-SILC) | statbel.fgov.be | NUTS-1 | Annuel | Méthodologie EU harmonisée |

**Avantage unique du cycle 2024 :** Flandre (Diependaele, N-VA) et Wallonie (Dolimont, MR) ont formé leur gouvernement été/automne 2024. Bruxelles non. → Comparaison "difference-in-differences" naturelle : mêmes élections, même contexte macro, résultats gouvernementaux différents.

#### Tier 2 — Comparaisons internationales (Eurostat NUTS-2)

| Indicateur | Code Eurostat | Cas comparables | Note |
|-----------|--------------|-----------------|------|
| PIB/habitant (PPS) | `nama_10r_2gdp` | Irlande du Nord (pré-Brexit), Madrid, Amsterdam | BE10 = BXL dans Eurostat |
| Taux d'emploi 20-64 | `lfst_r_lfe2emprt` | Tous les NUTS-2 UE | Parfaitement comparable |
| Investissement (FBCF) | `nama_10r_2gfcf` | Idem | Lag 2 ans |
| Absorption fonds UE | cohesiondata.ec.europa.eu | Tous les programmes UE | Directement impacté par la capacité gouvernementale |
| Qualité de gouvernance | EQI (Univ. Gothenburg) | NUTS-1/2, vagues 2010-2024 | Enquête, pas donnée admin |

#### Cas internationaux comparables

| Cas | Période | Durée | Résolution | Source comparable |
|-----|---------|-------|------------|-------------------|
| **Irlande du Nord** (Stormont) | 2017-2020, 2022-2024 | 1 095j puis 730j | New Decade New Approach / retour DUP 2024 | NISRA + Eurostat pré-Brexit |
| **Espagne** | 2015-2016 | 315 jours | Nouvelles élections → Rajoy minoritaire | INE + Eurostat |
| **Pays-Bas** | 2021-2022 | 299 jours | Rutte IV (même coalition reformée) | CBS + Eurostat |
| **Belgique fédérale** | 2010-2011 | 541 jours | Di Rupo (compromis institutionnel BHV) | NBB + Statbel |
| **Belgique fédérale** | 2019-2020 | 494 jours | De Croo (COVID comme déclencheur) | NBB + Statbel |

**Attention méthodologique :** les gouvernements technocratiques italiens (Monti, Draghi) ne sont PAS des caretakers — ils sont de plein exercice et souvent PLUS productifs. Ne pas les comparer aux affaires courantes belges.

#### Ce qui ne sera PAS comparé (méthodologies incompatibles)

- Actiris vs FOREM vs VDAB (données administratives, définitions différentes)
- Budgets régionaux bruts sans harmonisation Cour des comptes
- World Bank WGI (trop macro, trop lagué, country-level)

### Cartes solution — Les voies de sortie réalistes

**Principe éditorial :** chaque carte solution est factuelle. Pas de prescription ("il faudrait que..."), mais une description du mécanisme, du précédent, et de la faisabilité.

| # | Solution | Type | Mécanisme | Précédent | Faisabilité | Délai | Qui peut déclencher |
|---|----------|------|-----------|-----------|-------------|-------|---------------------|
| S1 | **Coalition classique retardée** | Politique | Les partis finissent par s'accorder sur un programme de gouvernement complet | Belgique fédérale 2011 (Di Rupo après 541j), 2020 (De Croo après 494j) | **Haute** — c'est le scénario par défaut | Indéterminé | Partis politiques bruxellois |
| S2 | **Gouvernement d'urgence à mandat limité** | Politique | Accord sur un programme court (budget, fonds UE, dossiers urgents) sans accord global | Pas de précédent formel belge, mais "accords partiels" existent | **Moyenne** | Semaines | Partis politiques |
| S3 | **Gouvernement minoritaire** | Constitutionnel | Un gouvernement sans majorité parlementaire, votant au cas par cas avec des partis d'appoint | Danemark, Suède, Norvège (courant) — jamais fait en Belgique | **Moyenne-faible** | Semaines | Formateur + partis |
| S4 | **Motion de méfiance constructive** | Parlementaire | Le Parlement BXL vote simultanément la destitution du sortant et la nomination d'un nouveau M-P | Mécanisme légal existant (Loi spéciale 12/01/1989) — jamais utilisé à BXL | **Faible** | Immédiat | Majorité parlementaire |
| S5 | **Gouvernement technocratique** | Constitutionnel | Gouvernement d'experts non-partisans | Italie (Monti 2011, Draghi 2021) — jamais fait en Belgique | **Très faible** | Semaines | Consensus politique |
| S6 | **Nouvelles élections** | Constitutionnel | Dissolution du Parlement BXL et retour aux urnes | Mandat fixe 5 ans (Loi spéciale 1989, Art. 28) — dissolution quasi impossible | **Quasi nulle** | Mois | Conditions légales très restrictives |

**Point important :** au niveau régional bruxellois, il n'y a PAS de rôle royal (contrairement au fédéral). Le Parlement bruxellois gère la formation lui-même. Pas d'informateur/formateur désigné par le Roi.

---

## 5bis) Architecture contenu — Velite + Zod (context7)

*Section ajoutée suite aux recommandations context7 sur les bonnes pratiques de contenu structuré extensible.*

### Pourquoi Velite (et pas Contentlayer ou MDX brut)

| Critère | Velite | Contentlayer | MDX brut dans Next.js |
|---------|--------|-------------|----------------------|
| Validation schéma | Zod natif — erreur au build si champ manquant | Schéma custom — moins strict | Aucune validation |
| Collections multiples | Oui — pattern glob par collection | Oui | Manuel |
| Nested types | Zod `.object()` imbriqué | `defineNestedType` | Manuel |
| Computed fields | `.transform()` | `computedFields` | Manuel |
| MDX support | `s.mdx()` natif | Oui | Natif Next.js |
| Maintenance | Actif (score context7: 84.7) | Moins actif | N/A |

### Collections Velite prévues

```
collections/
├── domainCards/          ← Cartes domaine (Budget, Mobilité...)
│   ├── budget.fr.mdx
│   ├── budget.nl.mdx
│   ├── mobility.fr.mdx
│   └── mobility.nl.mdx
├── sectorCards/          ← Cartes secteur (V1)
│   ├── associatif.fr.mdx
│   ├── horeca.fr.mdx
│   └── ...
├── comparisonCards/      ← Cartes comparaison (V1)
│   ├── bxl-vs-flanders-employment.fr.mdx
│   └── ...
├── solutionCards/        ← Cartes solution
│   ├── classical-coalition.fr.mdx
│   ├── emergency-government.fr.mdx
│   └── ...
└── timeline/             ← Événements chronologiques (V1)
    ├── 2024-06-09-elections.fr.mdx
    └── ...
```

### Schéma type pour chaque collection (Zod via Velite)

**Carte domaine :**
```
domain: enum [budget, mobility, housing, employment, climate, social]
status: enum [blocked, delayed, ongoing, resolved]
blockedSince: date | null
sectors: [string]  → liens vers les cartes secteur associées
sources: [{ label, url, accessedAt }]
confidenceLevel: enum [official, estimated, unconfirmed]
metrics: [{ label, value, unit, source, date }]
```

**Carte secteur :**
```
parentDomain: enum (référence vers la carte domaine parente)
sector: string (ex: "associatif", "horeca", "construction")
frozenMechanisms: [{ name, description, since }]
activeMechanisms: [{ name, description }]
impactIndicators: [{ label, value, source, url, frequency }]
stakeholders: [{ name, type: enum [federation, agency, ngo, union], url }]
humanImpact: string (phrase simple : "~80 000 emplois concernés")
```

**Carte comparaison :**
```
comparisonType: enum [intra-belgian, international]
entities: [{ name, code }]  → ex: [{ "BXL", "BE10" }, { "Flandre", "BE2" }]
indicator: string
sourceDataset: { name, url, code }  → ex: { "Statbel LFS", "statbel.fgov.be", "..." }
methodology: string  → explication courte de pourquoi c'est comparable
dataPoints: [{ entity, value, date }]
caveat: string | null  → ex: "Lag de 2 ans pour le PIB régional"
```

**Carte solution :**
```
solutionType: enum [political, constitutional, parliamentary]
feasibility: enum [high, medium, low, very-low, near-zero]
timeline: enum [immediate, weeks, months, years]
precedent: { description, country, year } | null
legalBasis: string | null  → ex: "Loi spéciale 12/01/1989, Art. 28"
mechanism: string  → explication factuelle
risks: [string]
whoCanTrigger: string
```

### Extensibilité concrète

Ajouter une carte de n'importe quel type = **créer 2 fichiers** (FR + NL) dans le bon dossier.

- Velite détecte automatiquement les nouveaux fichiers (pattern glob)
- Zod valide le frontmatter au build → erreur immédiate si un champ manque
- L'UI itère sur `allDomainCards`, `allSectorCards`, etc. → pas de code en dur par carte
- Les relations (domaine → secteurs, domaine → comparaisons) sont résolues par convention de nommage

**Temps pour ajouter une nouvelle carte :** ~30 min (rédaction) + ~30 min (traduction NL) + 0 min de code.

---

## 6) Neutralité, Risques Juridiques & Éthiques

### Risque de diffamation / ciblage / polarisation

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Un politicien estime qu'une carte impact le cible personnellement | Moyenne | Élevé (mise en demeure, bad buzz) | Ne JAMAIS nommer de politicien individuel dans les cartes impact MVP. Focus sur les institutions et les processus, pas les personnes. |
| Perception partisane (l'outil favorise un camp) | Élevée | Élevé (perte de crédibilité) | Comité consultatif pluraliste, méthodologie publique, pas de ranking. |
| Polarisation communautaire FR/NL | Moyenne | Élevé | Bilinguisme intégral, pas de comparaison inter-communautaire. |
| Récupération par un parti politique | Élevée | Moyen | Charte éditoriale publique interdisant toute affiliation, refus de financement partisan. |

### Comment éviter le "name & shame"

1. **Règle absolue MVP :** aucun nom de politicien individuel. On parle de "le gouvernement sortant", "le formateur désigné", "le Parlement bruxellois" — jamais de "Monsieur X n'a pas fait Y".
2. **V1+ :** si on introduit le suivi parlementaire (V1.3), on présente les données brutes (présences, votes) sans commentaire évaluatif ni scoring.
3. **Pas de classement, pas de palmarès, pas de "meilleur/pire".**

### Tableau de responsabilité factuel sans éditorialisation

Format proposé pour les cartes impact :

```
[DOMAINE] — [TITRE FACTUEL]
Statut : [En attente / En cours / Bloqué]
Depuis : [date]
Raison du blocage : [description factuelle — ex: "nécessite une décision
  du gouvernement régional, actuellement en affaires courantes"]
Source : [lien]
Dernière mise à jour : [date]
```

Pas de : "à cause de", "par la faute de", "malgré les promesses de".

### RGPD

| Aspect | Approche |
|--------|----------|
| **Base légale (contenu public)** | Intérêt légitime (Art. 6(1)(f) RGPD) + exception journalistique (Art. 85 RGPD / Art. 24 Loi belge du 30/07/2018) — uniquement des données relatives aux fonctions publiques |
| **Données utilisateurs** | Consentement explicite pour les alertes email (Art. 6(1)(a)). Double opt-in. |
| **Cookies/Analytics** | Analytics privacy-friendly (Plausible ou Matomo avec IP anonymisées) — pas de cookies tiers. Bandeau cookie conforme (Loi du 13/06/2005, Art. 129). |
| **Droit de réponse** | Mécanisme prévu : formulaire de contact + engagement de traitement sous 48h (Loi du 23/06/1961). |
| **DPO** | Non obligatoire pour une petite structure, mais un responsable RGPD désigné. |
| **Documentation** | LIA (Legitimate Interest Assessment) rédigée avant le lancement. Privacy policy FR/NL. |

### Accessibilité & Inclusivité

| Aspect | Approche |
|--------|----------|
| **WCAG** | Cible WCAG 2.1 AA. Pas obligatoire légalement pour un site privé, mais cohérent avec la mission. |
| **Test** | Audit Lighthouse + test manuel lecteur d'écran (VoiceOver) avant chaque release. |
| **Langues** | FR/NL pour le MVP. EN en V1. Pas d'obligation légale pour un site privé, mais essentiel pour la crédibilité bruxelloise. |
| **Mobile-first** | Design responsive, performance cible < 3s sur 3G. |
| **Langage clair** | Niveau de lecture B1 (CECRL) — pas de jargon politique/juridique sans explication. |

---

## 7) IA — Seulement si Utile

### Où l'IA aide réellement (V1, pas MVP)

| Usage | Utilité | Risque | Verdict |
|-------|---------|--------|---------|
| Résumé automatique de documents longs (avis Brupartners, rapports Cour des comptes) | Élevée — gain de temps énorme | Hallucinations, perte de nuance | **V1 uniquement**, avec citations obligatoires et lien vers l'original |
| Clustering thématique de questions parlementaires | Moyenne — aide à identifier les tendances | Catégorisation incorrecte | **V1**, avec validation humaine |
| Traduction assistée NL↔FR | Élevée — réduit le coût de traduction | Erreurs de traduction | **V1**, avec relecture humaine systématique |
| Extraction structurée de données depuis PDF | Élevée — les PDF sont le goulot d'étranglement | Erreurs d'extraction | **V1**, avec validation par échantillonnage |

### Garde-fous (obligatoires si IA en V1)

1. **Citation obligatoire** : tout résumé IA doit inclure les passages originaux cités
2. **Mention claire** : badge "Résumé assisté par IA" sur chaque contenu généré
3. **"Unknown" explicite** : si le modèle n'est pas sûr → "Information non confirmée"
4. **Pas d'IA dans le MVP** : le contenu MVP est 100% rédigé et vérifié par des humains
5. **Pas d'IA générative face au public** (pas de chatbot, pas de Q&A automatique)

---

## 8) Métriques de Succès & Critères d'Acceptation

### KPI (5 max)

| # | KPI | Cible MVP (M1-M2) | Méthode de mesure |
|---|-----|--------------------|-------------------|
| K1 | **Visiteurs uniques / semaine** | 500+ après 2 semaines | Analytics (Plausible) |
| K2 | **Taux de partage** (partage / visite) | > 5% | Tracking liens de partage (UTM) |
| K3 | **Rétention J7** (% visiteurs qui reviennent dans les 7 jours) | > 15% | Analytics cohorte |
| K4 | **Inscriptions alertes email** | 200+ en 4 semaines | Base email |
| K5 | **Citations presse** | 2+ articles dans les 6 premières semaines | Veille manuelle |

### Critères d'acceptation par feature MVP

**F1 — Compteur de crise**

```
Given   un utilisateur arrive sur la page d'accueil
When    la page se charge
Then    il voit le nombre de jours depuis le 9 juin 2024 (ou la date de
        début des affaires courantes), mis à jour automatiquement,
        avec une phrase d'explication en FR ou NL selon sa langue
```

**F2 — Cartes impact**

```
Given   un utilisateur consulte une carte impact
When    il lit la carte
Then    il voit : titre, statut, résumé factuel (< 200 mots), source(s)
        cliquable(s), date de dernière mise à jour, badge de confiance

Given   un utilisateur consulte une carte impact
When    il clique sur la source
Then    il est redirigé vers le document officiel original
```

**F4 — Système email**

```
Given   un utilisateur veut s'inscrire
When    il entre son email, choisit sa langue, et coche au moins 1 thème
Then    il reçoit un email de confirmation (double opt-in)
And     après confirmation, il est Contact Resend avec les Topics sélectionnés

Given   une carte suivie par l'abonné a été modifiée cette semaine
When    le cron du lundi 8h s'exécute
Then    l'abonné reçoit un digest contenant uniquement les cartes
        modifiées correspondant à ses thèmes
And     chaque item contient : titre + changeSummary + lien vers la carte

Given   aucune carte suivie par l'abonné n'a changé cette semaine
When    le cron du lundi 8h s'exécute
Then    l'abonné ne reçoit PAS de digest (zéro email)

Given   un abonné veut modifier ses préférences
When    il clique "Gérer mes préférences" dans n'importe quel email
Then    il accède à une page où il peut modifier thèmes, fréquence, langue
And     il peut se désabonner totalement en 1 clic
```

**F4 — Page Données**

```
Given   un utilisateur (journaliste/chercheur) accède à la page Données
When    il sélectionne un thème
Then    il voit un tableau structuré avec métriques, sources, dates
And     il peut exporter en CSV avec métadonnées
```

**F6 — Multilinguisme FR/NL/EN/DE**

```
Given   un utilisateur accède à BTR
When    il sélectionne une langue (FR, NL, EN ou DE)
Then    l'UI (navigation, labels, boutons) s'affiche intégralement
        dans la langue choisie
And     les URLs reflètent la langue (/fr/... /nl/... /en/... /de/...)
And     les cartes traduites s'affichent dans la langue choisie

Given   une carte n'est pas encore traduite dans la langue choisie
When    l'utilisateur consulte cette carte
Then    la version FR s'affiche avec un bandeau
        "Version française — traduction [langue] en cours"
And     le reste de l'UI reste dans la langue choisie

Given   un utilisateur s'inscrit aux emails
When    il choisit sa langue
Then    tous ses emails (digest, alertes) arrivent dans cette langue
```

### Definition of Done

**Produit :**
- Feature testée sur mobile (iOS Safari + Android Chrome)
- Contenu vérifié par au moins 1 personne autre que l'auteur
- Chaque source vérifiée (lien actif, donnée correcte)
- Traduction NL vérifiée par un néerlandophone

**Tech :**
- Tests unitaires sur la logique critique (calcul du compteur, export CSV)
- Lighthouse score > 90 (Performance, Accessibility, SEO)
- Pas de donnée personnelle stockée sans consentement
- Déployé en staging + validé avant mise en production

---

## 9) Architecture & Stack (Proposition)

*Rappel : cette section vient APRÈS le reste. Elle est conditionnée par la validation des sections précédentes.*

### Stack recommandée

| Couche | Choix | Justification |
|--------|-------|---------------|
| **Frontend** | Next.js (App Router) + TypeScript | SSR/SSG pour la performance et le SEO. Le compteur et les cartes sont du contenu quasi-statique. Écosystème React mature. |
| **Styling** | Tailwind CSS | Rapid prototyping, responsive mobile-first, bon support accessibilité avec les bons patterns. |
| **CMS / Contenu** | Velite (Zod + MDX) — Git-based | Collections typées par schéma Zod, auto-découvertes par glob. Ajouter une carte = ajouter un fichier. Validé par context7 (score 84.7). |
| **i18n** | next-intl | Support FR/NL avec routing basé sur la locale (/fr, /nl). Bien intégré à Next.js App Router. |
| **Email** | Resend ou Brevo (ex-Sendinblue) | Resend : simple, bon DX, tarif startup. Brevo : alternative EU-based si RGPD-sensible. |
| **Analytics** | Plausible (self-hosted ou cloud) | Privacy-friendly, pas de cookies, conforme RGPD sans bandeau cookie complexe. |
| **Hébergement** | Vercel (gratuit pour le MVP) | Déploiement Next.js natif. CDN global. Free tier suffisant pour le trafic MVP. |
| **Base de données** | Aucune en MVP | Le contenu est dans le repo (MDX). Les emails d'alerte sont gérés par le service email. Si besoin V1 : SQLite via Turso ou PostgreSQL via Supabase. |
| **Monitoring** | Vercel Analytics + Sentry (free tier) | Monitoring de performance et d'erreurs. |

### Modèle de données (entités principales)

Voir section **5bis) Architecture contenu** pour les schémas Velite/Zod détaillés de chaque type de carte.

```
4 types de cartes (collections Velite) :
├── DomainCard    — vue macro par domaine (Budget, Mobilité, Emploi...)
├── SectorCard    — vue détaillée par secteur (Associatif, Horeca, Construction...)
├── ComparisonCard — comparaison factuelle BXL vs autre entité
└── SolutionCard  — voie de sortie de crise

+ entités transversales :
├── CrisisCounter { startDate, endDate, currentDay: computed }
├── Metric { label, value, unit, source, date }
└── AlertSubscription { email, themes[], confirmed, locale }
```

Chaque type a son propre schéma Zod validé au build (voir 5bis).

### API design high-level

En MVP, **pas d'API séparée**. Le contenu est servi en SSG (static site generation) depuis les fichiers MDX. L'export CSV est généré au build time.

En V1 :
- `GET /api/cards` — liste des cartes impact (filtrable par domaine, statut)
- `GET /api/cards/:id` — détail d'une carte
- `GET /api/metrics` — métriques structurées (filtrable par domaine)
- `GET /api/export/:domain` — export CSV d'un domaine
- `POST /api/subscribe` — inscription alerte email

### Hébergement & coûts (ordre de grandeur)

| Poste | Coût mensuel estimé |
|-------|---------------------|
| Vercel (Hobby → Pro si besoin) | 0 € → 20 € |
| Plausible Cloud | 9 € (ou 0 € self-hosted) |
| Resend (emails) | 0 € (free tier: 3000 emails/mois) |
| Domaine (btr.brussels ou similaire) | ~2 €/mois (25 €/an) |
| Sentry (free tier) | 0 € |
| **Total MVP** | **~10-30 €/mois** |

### Sécurité de base

| Aspect | Approche |
|--------|----------|
| Auth | Pas d'auth utilisateur en MVP (site public, lecture seule). Admin : accès Git repo. |
| Rate limiting | Vercel edge middleware si nécessaire. Pas critique en MVP (pas d'API publique). |
| HTTPS | Par défaut sur Vercel. |
| CSP headers | Content Security Policy stricte pour prévenir XSS. |
| Input sanitization | Email validation côté client + côté serveur pour les inscriptions alertes. |
| Logs | Vercel logs + Sentry pour les erreurs. Pas de logs personnels. |

---

## 10) Plan de Livraison

### Jalons hebdomadaires (6 semaines)

| Semaine | Jalon | Livrable |
|---------|-------|----------|
| **S0** (actuelle) | Discovery & validation | Ce document v0.2 validé + réponse question cartes solution |
| **S1** | Setup + contenu | Repo Next.js + Velite + Tailwind, CI/CD, rédaction 2 cartes domaine (Budget + Mobilité) + 1-2 cartes solution (FR), audit données ciblé sur ces 2 domaines uniquement |
| **S2** | Compteur + cartes | Compteur fonctionnel, cartes domaine + solution affichées, layout mobile-first, structure i18n FR/NL |
| **S3** | NL + alertes + données | Traduction NL de tout le contenu, alertes email (inscription + envoi), page Données + export CSV |
| **S4** | Polish + test + carte 3 | Carte Emploi si données OK, tests accessibilité, cross-browser, relecture NL native |
| **S5** | Beta privée | Staging, 10-15 testeurs (journalistes, syndicalistes, citoyens, chercheurs), feedback |
| **S6** | Lancement MVP | Corrections, production, annonce presse/réseaux. Post-lancement : ajout de cartes au fil de l'eau (1 fichier = 1 carte). |

### Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Données budget non disponibles en format structuré | Élevée | Élevé | Extraction manuelle des PDF-clés pour le MVP. Automatisation en V1. |
| Traduction NL insuffisante/tardive | Moyenne | Élevé | Identifier un traducteur NL dès S0. Contenu court = traduction rapide. |
| Pas assez de contenu pour 5-8 cartes solides | Moyenne | Moyen | Prioriser 5 cartes bien sourcées plutôt que 8 cartes faibles. |
| Réaction hostile d'un acteur politique | Faible-Moyenne | Élevé | Charte de neutralité publiée avant le lancement. Droit de réponse opérationnel. Avis juridique préventif. |
| Faible trafic au lancement | Moyenne | Moyen | Stratégie presse ciblée (5 journalistes BXL identifiés). Partage via réseaux syndicaux et associatifs. |
| Gouvernement formé avant le lancement | Faible | Élevé | Le produit reste pertinent : on pivote vers "bilan de la crise" + suivi des engagements du nouveau gouvernement. |

### Plan de tests

| Type | Quoi | Quand |
|------|------|-------|
| **Unitaires** | Calcul compteur, export CSV, validation email | Continu (S1-S6) |
| **Accessibilité** | Lighthouse, axe-core, test VoiceOver | S4 + S5 |
| **Cross-browser** | Safari iOS, Chrome Android, Firefox Desktop | S4 |
| **Performance** | Lighthouse perf, test 3G throttled | S4 |
| **Contenu** | Relecture factuelle de chaque carte par une 2e personne | S3-S4 |
| **Utilisateur** | 10-15 testeurs beta, questionnaire qualitatif | S5 |

### Plan de démo

- **S2** : Démo interne (compteur + 3 cartes, mobile) → feedback boucle 1
- **S4** : Démo élargie (version quasi-complète, FR + NL) → feedback boucle 2
- **S5** : Beta privée avec vrais utilisateurs → feedback final
- **S6** : Lancement public

---

## Actions pré-développement

| # | Action | Statut | Responsable |
|---|--------|--------|-------------|
| A1 | Réserver le nom de domaine (.brussels / .be) | **En cours** | Advice That SRL |
| A2 | Rédiger la charte éditoriale (1 page) | À faire | Advice That SRL |
| A3 | Créer le repo GitHub public (Source-Available) | À faire (S1) | Dev |
| A4 | Identifier 5 journalistes beta-testeurs | À faire (S4-S5) | Advice That SRL |

---

**Statut : analyse amont COMPLÈTE. Toutes les décisions sont verrouillées. Prêt pour le développement dès que le domaine est réservé.**

*Document v1.0 — Brussels Governance Monitor — 2026-02-06*
