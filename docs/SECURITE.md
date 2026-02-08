# BGM — Politique de sécurité

*Document interne — Advice That SRL*
*Version 1.0 — 7 février 2026*

---

## Pourquoi ce document existe

BGM est un projet touchant à la politique. Le risque de cyberattaque motivée politiquement n'est pas théorique. Ce document définit les mesures de sécurité minimales et les procédures de réponse à incident.

---

## 1. Comptes et accès

### Règle absolue : 2FA partout

| Service | Compte | 2FA activé | Vérifié le |
|---------|--------|-----------|-----------|
| GitHub | zoltan2 | [ ] | [ ] |
| Vercel | zoltan2s-projects | [ ] | [ ] |
| Resend | [compte email] | [ ] | [ ] |
| Registrar domaine | [à préciser] | [ ] | [ ] |
| Umami Cloud | cloud.umami.is | [ ] | [ ] |
| Email principal | [à préciser] | [ ] | [ ] |
| Gestionnaire de mots de passe | [à préciser] | [ ] | [ ] |

### Principe du moindre privilège

- Un seul compte admin par service (le responsable principal)
- Les contributeurs futurs reçoivent un accès en lecture sur GitHub, jamais en écriture directe
- Les contributions passent par des Pull Requests (revue obligatoire)
- Aucun compte partagé

### Mots de passe

- Minimum 16 caractères, générés par un gestionnaire
- Uniques par service (jamais de réutilisation)
- Stockés exclusivement dans le gestionnaire de mots de passe
- Jamais dans le code, les emails, ou les messages

---

## 2. Code et déploiement

### Protection du repo

- [ ] Branch protection sur `main` : pas de push direct, PR obligatoire
- [ ] Revue de PR obligatoire avant merge (quand l'équipe > 1)
- [ ] Aucun secret dans le code (`.env.local` gitignored, `.env.example` avec valeurs vides)
- [ ] Dependabot activé pour les alertes de sécurité sur les dépendances

### Headers de sécurité (déjà en place)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Protection des API routes

- Rate limiting sur `/api/subscribe` : 5 requêtes/minute/IP (en place)
- Honeypot anti-spam sur le formulaire d'inscription (en place)
- Validation Zod de toutes les entrées (en place)
- Pas de `dangerouslySetInnerHTML`
- MDX compilé au build (pas d'exécution dynamique)

---

## 3. Données personnelles

### Données collectées

| Donnée | Où | Durée | Base légale |
|--------|-----|-------|-------------|
| Email abonné | Resend | Jusqu'à désinscription + 30j | Consentement (double opt-in) |
| Préférences (langue, topics) | Resend tags | Idem | Consentement |
| Feedback (si email fourni) | [À définir] | 1 an après traitement | Consentement |
| Analytics (anonymes) | Plausible | Indéfini | Intérêt légitime (pas de données personnelles) |

### Mesures de protection

- Pas de cookies (Plausible est cookieless)
- Pas de tracking tiers (pas de Google Analytics, pas de Meta Pixel)
- HTTPS obligatoire (force redirect)
- Données email chiffrées en transit (TLS)
- Désinscription en 1 clic dans chaque email

---

## 4. Domaine et DNS

- [ ] Renouvellement automatique activé
- [ ] Verrouillage de transfert activé (registrar lock)
- [ ] Alertes d'expiration configurées (90j, 30j, 7j avant)
- [ ] DNSSEC activé si supporté par le registrar
- [ ] Monitoring DNS (alerte si les enregistrements changent)

---

## 5. Sauvegardes

### Code source
- **Primaire** : GitHub (zoltan2/brussels-governance-monitor)
- **Secondaire** : Clone local à jour (pull régulier)
- [ ] Miroir sur GitLab ou Codeberg (optionnel, recommandé)

### Données abonnés
- Stockées chez Resend (leur infrastructure)
- [ ] Export régulier de la liste des abonnés (mensuel)
- [ ] Stockage sécurisé de l'export (chiffré, hors cloud)

### Contenu éditorial
- Versionné dans Git (328 fichiers MDX)
- Chaque commit est un point de restauration
- Le build Velite valide l'intégrité des données à chaque déploiement

---

## 6. Réponse à incident

### Niveau 1 — Incident mineur

**Exemples** : lien mort, erreur d'affichage, email non délivré

**Actions** :
1. Corriger le problème
2. Documenter dans le journal d'audit
3. Pas de communication externe nécessaire

### Niveau 2 — Incident modéré

**Exemples** : indisponibilité > 1h, erreur factuelle publiée, tentative de spam

**Actions** :
1. Diagnostiquer et corriger
2. Si erreur factuelle : appliquer le protocole de correction (voir charte éditoriale)
3. Documenter dans le journal d'audit
4. Informer les abonnés si affectés

### Niveau 3 — Incident majeur

**Exemples** : compromission de compte, defacement, fuite de données abonnés, attaque DDoS

**Actions** :
1. **Immédiat** : révoquer les accès compromis, changer les credentials
2. **Sous 1h** : évaluer l'étendue de la compromission
3. **Sous 4h** : restaurer le service (redéploy depuis commit sain)
4. **Sous 24h** : informer les abonnés si leurs données sont potentiellement exposées
5. **Sous 72h** : notification à l'Autorité de protection des données (APD) si fuite de données personnelles (obligation RGPD)
6. **Post-incident** : analyse root cause, mesures correctives, mise à jour de ce document

---

## 7. Checklist de sécurité périodique

### Mensuel
- [ ] Vérifier que 2FA est actif sur tous les comptes
- [ ] Vérifier les alertes Dependabot (dépendances vulnérables)
- [ ] Vérifier que le certificat SSL est valide
- [ ] Pull local du repo (backup)

### Trimestriel
- [ ] Rotation des tokens d'API (Resend, Vercel)
- [ ] Revue des permissions GitHub (qui a accès ?)
- [ ] Test de restauration (cloner le repo, build, vérifier)
- [ ] Vérifier l'expiration du domaine

### Annuel
- [ ] Audit de sécurité complet (headers, dépendances, accès)
- [ ] Revue de la politique de confidentialité
- [ ] Revue des sous-traitants (Vercel, Resend) et de leur conformité

---

## 8. Ce que BGM ne fait PAS

- Pas de stockage de mots de passe utilisateurs (pas de comptes)
- Pas de paiement en ligne (pas de données bancaires)
- Pas d'upload de fichiers par les utilisateurs
- Pas d'exécution de code côté serveur (sauf API routes Next.js)
- Pas de base de données exposée publiquement

Cette surface d'attaque réduite est un choix architectural délibéré.

---

**Dernière révision** : 7 février 2026
**Prochaine révision prévue** : mai 2026
