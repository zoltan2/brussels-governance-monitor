# Audit : Documents fondateurs vs. Code déployé

*Document de traçabilité — Brussels Governance Monitor*
*Généré le 10 février 2026*
*Auteur : Claude (assistant éditorial)*

---

## Objectif

Ce document confirme l'usage de chaque document sous `/docs` dans le développement du site, identifie les écarts entre les spécifications documentées et le code déployé, et explique chaque évolution.

---

## 1. Inventaire des documents et leur rôle

### 1.1 ANALYSE_AMONT.md (v1.0, 6 février 2026)

**Rôle : Document fondateur — toutes les décisions structurantes du projet.**

C'est le document que je consulte en premier et le plus souvent. Il contient :

| Section | Usage concret dans le code |
|---------|---------------------------|
| Décisions D1-D13 (lignes 13-27) | Architecture complète : Velite+Zod+MDX (D2), Resend+React Email (D6), 4 langues (D7), AGPL v3 (D9), palette neutre (D12) |
| Section 0 — Cadre institutionnel (l.31-100) | Mentions légales, charte éditoriale, page privacy, footer ("Advice That SRL", "Non affilié") |
| F3/F4 — Système email (l.359-494) | Toute l'implémentation email : subscribe flow, confirm, welcome, digest, templates React Email |
| Préférences utilisateur (l.407-435) | Page de préférences, topics, mapping Resend |
| Pipeline d'information (l.437-460) | Cron digest lundi (`cron/digest/route.ts`), logique lastModified >= 7j |
| RGPD (l.485-494) | Double opt-in, 1-clic désabonnement, données minimales |
| User Stories F4 (l.814-836) | Spécifications email : inscription, digest, préférences |
| User Story F6 (l.847-866) | Multilinguisme : "tous ses emails arrivent dans cette langue" |
| Charte éditoriale (l.700+) | Page `/editorial`, règles NO politician names, NO red/green |
| Architecture technique (l.890-940) | Stack Next.js, routes API, structure fichiers |
| KPIs (l.780-790) | Objectif 200+ inscriptions email en 4 semaines |

### 1.2 BGM_SYSTEM_CONTEXT.md (consolidé, 8 février 2026)

**Rôle : Référence technique — modèle éditorial + schémas Velite.**

| Section | Usage concret |
|---------|---------------|
| 1.1 Les trois entités (Carte, Événement, Vérification) | Structure des 7 collections Velite dans `velite.config.ts` |
| Schéma Velite détaillé (section 2) | Tous les champs Zod : domainCards, solutionCards, sectorCards, formationRounds, formationEvents, glossaryTerms, comparisonCards |
| Exemples MDX (sections 3-4) | Modèles pour la rédaction de contenu |

### 1.3 ANALYSE_FEATURES_AVANCEES.md (v1, 8 février 2026)

**Rôle : Roadmap features avancées — évaluation de 12 fonctionnalités P1/P2.**

| Section | Usage |
|---------|-------|
| Feature #3 — Score de vérifiabilité | Implémenté via `confidenceLevel` sur les cartes |
| Feature #9 — Mode pédagogique | Partiellement implémenté : explainers, FAQ, glossaire, `summaryFalc` |
| Feature #10 — Timeline narrative | Implémenté via formationRounds + formationEvents |
| Features #1, #5, #6, #11, #12 | Non implémentées — classées P2, pas encore dans le code |

### 1.4 ANALYSE_IA_ULTRA_SYNTHESE.md (v1, 8 février 2026)

**Rôle : Architecture de l'information — structure de navigation et contenus pédagogiques.**

| Section | Usage |
|---------|-------|
| 16 concepts fondamentaux | Base de rédaction des 6 explainers |
| 7 tensions clés | Structurent les explainers `brussels-paradox` et `levels-of-power` |
| Hub "Bruxelles en bref" (proposé) | Implémenté : `/explainers/brussels-overview` |
| Hub "Bruxelles cosmopolite" (proposé) | Implémenté : `/explainers/brussels-cosmopolitan` |
| Restructuration "Comprendre" | Implémenté : dropdown Fondamentaux / Éclairages dans la navigation |
| Related-cards en bas de page | Implémenté : composant `RelatedCards` sur les fiches domaine/secteur |

### 1.5 ANALYSE_SOURCES.md (v1.0, 8 février 2026)

**Rôle : Registre et qualification des sources — hiérarchie de confiance.**

| Section | Usage |
|---------|-------|
| 18 sources actuelles | Utilisées dans les fiches domaine/secteur (champ `sources[]` MDX) |
| Hiérarchie Rang A/B/C/D | Appliquée via `confidenceLevel` : official (A/B), estimated (B/C), unconfirmed (C) |
| 13 gaps identifiés | Guide la priorisation des sources à ajouter (GAP 1 = NL, GAP 4 = Moniteur Belge) |
| Page `/data` — Sources | Référentiel affiché sur la page Données |

### 1.6 GOUVERNANCE_INTERNE.md (v1.0, 7 février 2026)

**Rôle : Processus éditoriaux — qui fait quoi, workflow de publication.**

| Section | Usage |
|---------|-------|
| Rôles (Éditeur / Assistant / Contributeurs) | Workflow admin : page `/review` pour validation des cartes draft |
| Publication en 6 étapes | Implémenté : détection → qualification → rédaction → validation → publication → audit |
| Protocole événement sensible | Respecté dans la rédaction des formationEvents (pas de noms dans les cartes domaine) |
| SAS éditorial | Critères appliqués avant chaque ajout de contenu |

### 1.7 JOURNAL_AUDIT_EDITORIAL.md (v1.0, 7 février 2026)

**Rôle : Template et format du journal d'audit — traçabilité éditoriale.**

| Section | Usage |
|---------|-------|
| Format des entrées | Suivi lors de chaque publication de formationEvent |
| Types d'entrées | PUBLICATION, VERIFICATION, CORRECTION-MINEURE, etc. |
| Règle de journalisation | Chaque décision éditoriale significative est documentée |

### 1.8 PROTOCOLE_URGENCE.md (v1.0, 7 février 2026)

**Rôle : Procédures de continuité et gestion de crise.**

| Section | Usage |
|---------|-------|
| Scénario 2 (indisponibilité 7-30j) | Banner prévu dans `messages/{locale}.json` |
| Scénario 4 (site down) | Procédure Vercel + DNS + redeploy |
| Backup protocole | Code sur GitHub, données abonnés chez Resend, contenu MDX dans Git |

### 1.9 SECURITE.md (v1.0, 7 février 2026)

**Rôle : Politique de sécurité — comptes, code, API, incidents.**

| Section | Usage |
|---------|-------|
| Headers de sécurité | Configurés dans `next.config.ts` : CSP, X-Frame-Options, etc. |
| Protection API | Rate limiting sur `/api/subscribe`, honeypot anti-spam, validation Zod |
| Niveaux d'incident | Procédures L1/L2/L3 documentées |

### 1.10 source-registry.json + source-log.json

**Rôle : Données structurées des sources — registre + journal de consultation.**

| Fichier | Usage |
|---------|-------|
| `source-registry.json` | 18 sources institutionnelles avec URLs, types, fréquences |
| `source-log.json` | 5 entrées de consultation documentées |

---

## 2. Écarts identifiés et justifications

### 2.1 Langues des emails : doc = FR/NL, code = FR/NL/EN/DE

**Référence doc :** ANALYSE_AMONT.md, l.409 — "Étape 1 (obligatoire) : email + langue (FR/NL)"

**Dans le code (avant correction du 10/02/2026) :**
- `subscribe/route.ts` : Zod schema n'acceptait que `fr|nl`
- `subscribe-form.tsx` : forçait `locale === 'fr' || locale === 'nl' ? locale : 'fr'`
- Tous les templates email (confirm, welcome, digest) : type `locale: 'fr' | 'nl'`, 0 traductions EN/DE
- Résultat : un utilisateur sur `/en/` s'inscrivant recevait tous ses emails en français

**User Story contradictoire :** ANALYSE_AMONT.md, l.863-865 :
> Given un utilisateur s'inscrit aux emails
> When il choisit sa langue
> Then tous ses emails arrivent dans cette langue

Et la décision D7 (l.21) : "FR/NL/EN/DE dès le MVP".

**Correction appliquée (commit `f1c97b1`) :**
- Zod schema élargi à `['fr', 'nl', 'en', 'de']`
- `subscribe-form.tsx` : accepte les 4 locales
- 5 templates email (confirm, welcome, digest, goodbye, preferences-updated) : traductions EN/DE ajoutées
- Sujets d'email traduits dans les 4 langues
- `SUPPORTED_DIGEST_LOCALES` élargi de `['fr', 'nl']` à `['fr', 'nl', 'en', 'de']`
- Toutes les assertions de type `locale as 'fr' | 'nl'` supprimées

**Le doc l.409 reste à "FR/NL" pour l'étape 1, mais le code applique désormais la user story F6 (l.863-865) qui dit explicitement "dans cette langue" sans restriction.**

### 2.2 Fréquence de digest : doc = 3 options, code = hebdo uniquement

**Référence doc :** ANALYSE_AMONT.md, l.422-425 :
```
Fréquence :
◉ Digest hebdo (recommandé)
○ Digest mensuel
○ Alertes événements uniquement
```

**Dans le code :** Seul le digest hebdomadaire est implémenté. Le cron tourne chaque lundi à 8h. Pas de fréquence mensuelle, pas d'alertes événement séparées.

**Justification :** Le doc précise l.474 : "En MVP : le digest est prioritaire." La fréquence mensuelle et les alertes événement sont des features V1+, pas encore développées. La page de préférences ne propose pas de choix de fréquence pour cette raison.

### 2.3 Newsletter éditoriale : doc = prévue, code = non implémentée

**Référence doc :** ANALYSE_AMONT.md, l.462-474 — Newsletter éditoriale comme complément au digest.

**Dans le code :** Aucun template newsletter, aucune route API dédiée. Le doc précise explicitement l.474 : "la newsletter peut démarrer manuellement via Resend dashboard sans dev supplémentaire."

**Statut :** Conforme au doc. Pas de code nécessaire en MVP.

### 2.4 Page de préférences : doc = topics + fréquence + langue, code = topics + langue

**Référence doc :** ANALYSE_AMONT.md, l.833-835 :
> il accède à une page où il peut modifier thèmes, fréquence, langue

**Dans le code :** La page `/subscribe/preferences` permet de modifier les topics et la langue, mais pas la fréquence (cf. 2.2 — fréquence unique en MVP).

**Justification :** Cohérent avec la décision MVP de n'implémenter que le digest hebdo. Quand les fréquences multiples seront ajoutées, la page de préférences sera enrichie.

### 2.5 Sondage de désinscription : non documenté dans les docs

**Référence doc :** ANALYSE_AMONT.md, l.490 — "Désabonnement : 1 clic, géré automatiquement par Resend dans les Broadcasts"

**Dans le code :** Le flow de désinscription passe par un sondage de satisfaction (notation 1-5 + commentaire libre) avant la confirmation. L'utilisateur peut aussi se désabonner directement via le GET `/api/unsubscribe` (fallback 1-clic).

**Justification :** Ajout fonctionnel du 10/02/2026. Le sondage est optionnel (le bouton "Confirmer" fonctionne sans notation ni commentaire). Le 1-clic reste accessible via le lien GET dans les anciens emails. Le sondage permet de collecter du feedback qualitatif pour améliorer le service.

### 2.6 Email goodbye : non documenté dans les docs

**Référence doc :** Aucune mention d'un email de confirmation de désinscription.

**Dans le code :** Un email `goodbye.tsx` est envoyé après la désinscription (4 langues). Notification admin avec rating + feedback.

**Justification :** Bonne pratique RGPD (confirmation que la demande est prise en compte) et courtoisie éditoriale. Le doc ANALYSE_AMONT.md l.490 mentionne "Données stockées : Email + langue + topics — rien d'autre" — le rating et le feedback ne sont pas stockés côté Resend mais envoyés en one-shot à l'admin.

### 2.7 Templates email : doc = 3, code = 6

**Référence doc :** ANALYSE_AMONT.md, l.483 — "Templates : 3 (bienvenue, digest, alerte) — Suffisant pour le MVP"

**Dans le code :** 6 templates React Email :
1. `confirm.tsx` — email de double opt-in (correspond au flow d'inscription documenté)
2. `welcome.tsx` — bienvenue après confirmation (= template "bienvenue" du doc)
3. `digest.tsx` — digest hebdomadaire (= template "digest" du doc)
4. `preferences-updated.tsx` — confirmation de modification des préférences (nouveau)
5. `goodbye.tsx` — confirmation de désinscription (nouveau)
6. Template "alerte événement" — **non implémenté** (mentionné dans le doc mais pas encore développé)

**Bilan :** 2/3 templates documentés sont implémentés (bienvenue, digest). Le template "alerte" est reporté. 3 templates supplémentaires non documentés ont été ajoutés (confirm pour le double opt-in, preferences-updated, goodbye).

### 2.8 Analytics : doc = Plausible, code = Umami

**Référence doc :** ANALYSE_AMONT.md, l.55 — "Analytics privacy-friendly (Plausible, pas de cookies tiers)"

**Dans le code :** Migration vers Umami Cloud (privacy-friendly, conforme RGPD). Configuré sur `governance.brussels`.

**Justification :** Décision post-doc. Umami offre les mêmes garanties privacy que Plausible, avec un dashboard plus adapté et un plan gratuit suffisant.

### 2.9 Domaine : doc = ".brussels ou .be", code = governance.brussels

**Référence doc :** ANALYSE_AMONT.md, D13 — "Domaine : À réserver (.brussels ou .be prioritaire)"

**Dans le code :** `governance.brussels` acquis et configuré. Domaine email : `mail.brusselsgovernance.be`.

### 2.10 Nombre de cartes domaine : doc = "2-3 MVP", code = 6

**Référence doc :** ANALYSE_AMONT.md, D1 — "Cartes domaine MVP : 2-3 (Budget + Mobilité + Emploi si données OK)"

**Dans le code :** 6 cartes domaine × 4 locales = 24 fichiers MDX (Budget, Mobilité, Emploi, Logement, Climat, Social).

**Justification :** Le MVP a été élargi après validation des sources pour les 6 domaines. Conforme à l'esprit du doc qui prévoyait l'extensibilité.

### 2.11 Nombre de cartes secteur : doc = "10 mappés", code = 11

**Référence doc :** ANALYSE_AMONT.md, D5 — "Cartes secteur : V1, 10 secteurs mappés"

**Dans le code :** 11 secteurs (ajout du secteur Logement-Immobilier).

### 2.12 Resend Contacts vs. Resend Broadcasts

**Référence doc :** ANALYSE_AMONT.md, l.430-433 — Topics comme Resend Topics, Segments internes.

**Dans le code :** Les préférences (locale, topics) sont stockées comme properties sur les Contacts Resend (pas comme Topics/Segments natifs Resend). Le digest est envoyé via `resend.emails.send()` (API transactionnelle) et non via Broadcasts.

**Justification :** L'API Resend Contacts permet un contrôle programmatique plus fin du filtrage par topics et locale. Les Broadcasts Resend sont prévus pour la newsletter manuelle (cf. doc l.472).

---

## 3. Éléments documentés mais non encore implémentés

| Élément (référence doc) | Statut | Raison |
|--------------------------|--------|--------|
| Alerte événement semi-auto (ANALYSE_AMONT l.375) | Non implémenté | Prévu V1+, nécessite workflow humain |
| Newsletter éditoriale (ANALYSE_AMONT l.462-474) | Non implémenté | Prévu via Resend dashboard, pas de code nécessaire |
| Fréquence mensuelle digest (ANALYSE_AMONT l.424) | Non implémenté | MVP = hebdo uniquement |
| Collection Vérification dans Velite (BGM_SYSTEM_CONTEXT l.52-60) | Implémenté partiellement | Collection `verifications` existe dans Velite, mais workflow de vérification pas automatisé |
| Cross-collection links Event ↔ Card (ANALYSE_FEATURES_AVANCEES) | Non implémenté | Feature P2 |
| Indice d'inertie institutionnelle (ANALYSE_FEATURES_AVANCEES #1) | Non implémenté | Classé P2, nécessite validation méthodologique |
| Détection non-événements (ANALYSE_FEATURES_AVANCEES #2) | Non implémenté | Classé P1, prévu prochaine itération |
| Fiche projet 360° (ANALYSE_FEATURES_AVANCEES #5) | Non implémenté | Classé P2 |
| Scénarios conditionnels (ANALYSE_FEATURES_AVANCEES #12) | Non implémenté | Classé P1, prévu pour budget uniquement |
| Sources NL/EN manquantes (ANALYSE_SOURCES GAP 1-3) | Non résolu | Priorisation P0, recherche en cours |
| Moniteur Belge RSS (ANALYSE_SOURCES GAP 4) | Non implémenté | Source identifiée, intégration prévue |
| Branch protection main (SECURITE l.48) | Non activé | Repo géré par un seul admin actuellement |
| Export données abonnés chiffré (PROTOCOLE_URGENCE) | Non implémenté | Prévu comme tâche manuelle mensuelle |

---

## 4. Résumé de conformité

| Document | Conformité | Note |
|----------|------------|------|
| ANALYSE_AMONT.md | **~90%** | Écarts justifiés : locales email (corrigé), fréquences (MVP), analytics (migration Umami) |
| BGM_SYSTEM_CONTEXT.md | **~95%** | Schéma Velite fidèle, 7 collections implémentées, exemples respectés |
| ANALYSE_FEATURES_AVANCEES.md | **~30%** | Normal : features P1/P2, pas encore dans le périmètre |
| ANALYSE_IA_ULTRA_SYNTHESE.md | **~85%** | 2 hubs créés, navigation restructurée, related-cards implémenté |
| ANALYSE_SOURCES.md | **~70%** | 18 sources utilisées, gaps identifiés mais pas encore résolus |
| GOUVERNANCE_INTERNE.md | **~80%** | Workflow publication respecté, page review implémentée |
| JOURNAL_AUDIT_EDITORIAL.md | **~60%** | Format défini, usage pas systématique |
| PROTOCOLE_URGENCE.md | **~50%** | Procédures documentées, pas toutes testées/automatisées |
| SECURITE.md | **~70%** | Headers OK, API protégée, 2FA checklist pas complétée |

---

## 5. Recommandations

1. **Mettre à jour ANALYSE_AMONT.md l.409** pour refléter les 4 locales email (FR/NL/EN/DE) conformément à la décision D7 et la user story F6.
2. **Ajouter les templates email actuels** (6 au lieu de 3) dans la section F3/F4 du doc.
3. **Documenter le sondage de désinscription** et l'email goodbye dans la section RGPD.
4. **Compléter la checklist 2FA** dans SECURITE.md.
5. **Systématiser le journal d'audit** (JOURNAL_AUDIT_EDITORIAL.md) pour chaque formationEvent ajouté.

---

*Ce document est un constat factuel. Il ne modifie aucun document sous `/docs`. Les recommandations de mise à jour sont soumises à validation de l'éditeur responsable.*
