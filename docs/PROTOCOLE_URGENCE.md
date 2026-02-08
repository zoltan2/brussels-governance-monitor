# BGM — Protocole d'urgence

*Document interne — Advice That SRL*
*Version 1.0 — 7 février 2026*

---

## Objectif

Ce document décrit les actions minimales à effectuer si le responsable principal de BGM est indisponible pendant plus de 48 heures (maladie, voyage, incident).

---

## Contacts d'urgence

| Rôle | Nom | Contact | Accès |
|------|-----|---------|-------|
| Responsable principal | [À compléter] | [email] | Tous accès |
| Backup opérationnel | [À recruter/identifier] | [email] | Accès Vercel + GitHub (lecture) |
| Contact technique Vercel | Support Vercel | support@vercel.com | Via compte projet |

---

## Accès critiques

Tous les accès sont protégés par 2FA. Les credentials sont stockés dans **[gestionnaire de mots de passe — à préciser]**.

| Service | URL | Rôle | 2FA |
|---------|-----|------|-----|
| GitHub (repo) | github.com/zoltan2/brussels-governance-monitor | Owner | Requis |
| Vercel (hébergement) | vercel.com/zoltan2s-projects | Owner | Requis |
| Resend (emails) | resend.com | Admin | Requis |
| Registrar (domaine) | [À préciser] | Admin | Requis |
| Plausible (analytics) | [À configurer] | Admin | Requis |

---

## Scénarios et actions

### Scénario 1 : Indisponibilité courte (2-7 jours)

**Action** : Rien. Le site est statique, il continue de fonctionner. Les cartes affichent leur date de dernière vérification. Les abonnés ne reçoivent pas de nouvelles notifications.

**Risque** : Faible. Le contenu reste pertinent pendant 7 jours.

### Scénario 2 : Indisponibilité moyenne (7-30 jours)

**Action du backup** :
1. Ajouter un bandeau d'information sur la page d'accueil :
   - FR : "BGM fonctionne actuellement en capacité réduite. Les mises à jour reprendront prochainement."
   - NL : "BGM werkt momenteel met beperkte capaciteit. Updates worden binnenkort hervat."
   - EN : "BGM is currently operating at reduced capacity. Updates will resume shortly."
   - DE : "BGM arbeitet derzeit mit eingeschränkter Kapazität. Aktualisierungen werden in Kürze fortgesetzt."
2. Fichier à modifier : `messages/fr.json`, `messages/nl.json`, `messages/en.json`, `messages/de.json` — ajouter une clé `banner.reducedCapacity`
3. Composant à activer : ajouter `<ReducedCapacityBanner />` dans `src/app/[locale]/layout.tsx` (composant à créer au préalable)

**Risque** : Modéré. Les indicateurs de fraîcheur des cartes deviennent orange/rouge. Les lecteurs réguliers remarquent l'absence de mises à jour.

### Scénario 3 : Indisponibilité longue (30+ jours)

**Action** :
1. Appliquer les actions du scénario 2
2. Envoyer un email aux abonnés via Resend : "BGM est temporairement en pause. Nous vous informerons de la reprise."
3. Évaluer la possibilité de transférer la responsabilité éditoriale à un partenaire (journaliste, académique, organisation partenaire)
4. Sauvegarder l'intégralité du repo localement (clone complet)

**Risque** : Élevé. La crédibilité de BGM comme outil de monitoring est compromise.

### Scénario 4 : Le site est inaccessible

**Diagnostic** :
1. Vérifier le statut Vercel : https://www.vercel-status.com/
2. Vérifier que le domaine résout correctement (DNS)
3. Vérifier que le repo GitHub est intact

**Actions** :
- Si Vercel est down → attendre (Vercel a un SLA de 99.99%)
- Si le déploiement est cassé → aller sur Vercel Dashboard, redéployer le dernier commit fonctionnel
- Si le repo est compromis → cloner depuis le miroir local, réinitialiser les credentials

### Scénario 5 : Compromission de sécurité

**Actions immédiates** :
1. Révoquer tous les tokens d'API (Resend, Vercel)
2. Changer les mots de passe de tous les comptes
3. Vérifier les commits récents sur GitHub (rechercher des commits non autorisés)
4. Si le site a été défiguré : redéployer depuis le dernier commit sain
5. Informer les abonnés si leurs données ont pu être exposées
6. Documenter l'incident

---

## Procédure de transfert d'urgence

Si le responsable principal quitte définitivement le projet :

1. Transférer la propriété du repo GitHub
2. Transférer le projet Vercel
3. Transférer le compte Resend (ou créer un nouveau compte et migrer les contacts)
4. Transférer le domaine
5. Mettre à jour les mentions légales (éditeur responsable)
6. Mettre à jour la politique de confidentialité (responsable du traitement)

Le code source étant AGPL v3, n'importe qui peut forker et relancer le projet.

---

## Vérification régulière

Ce document doit être relu et mis à jour :
- [ ] Tous les 3 mois
- [ ] À chaque changement de service (nouveau provider, nouveau domaine)
- [ ] À chaque ajout de personne ayant des accès

**Dernière vérification** : [À compléter]
