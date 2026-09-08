# Récap hebdomadaire des précommandes — installation du déclencheur

La route `GET /api/cron/preorders-recap` envoie à `contact@brusselsgovernance.be`
la liste prénom + email des précommandes du livre des sept derniers jours.
Elle part **même à zéro précommande** : un silence dans la boîte doit vouloir
dire « le cron est cassé », jamais « semaine calme ». C'est l'ambiguïté inverse
qui a laissé passer quatre mois de pertes entre le 16/04 et le 08/09/2026.

Le code vit dans le dépôt, l'horaire vit sur le VPS.

## Il n'y a qu'un fichier à créer

Le VPS dispose déjà d'un mécanisme générique : l'unité modèle
`bgm-cron@.service` lance `/opt/bgm/bgm-cron.sh <endpoint>`, qui appelle
`/api/cron/<endpoint>` **depuis l'intérieur du conteneur** `bgm-app`. Le
`CRON_SECRET` est lu dans l'environnement du conteneur et ne touche jamais
l'hôte. Il n'y a donc ni service à écrire, ni fichier d'environnement à poser.

Un seul timer suffit, sur le modèle des existants.

### `/etc/systemd/system/bgm-cron-preorders-recap.timer`

```ini
[Unit]
Description=BGM cron preorders-recap (hebdomadaire, mardi)

[Timer]
OnCalendar=Tue *-*-* 09:00:00 Europe/Brussels
Persistent=true
Unit=bgm-cron@preorders-recap.service

[Install]
WantedBy=timers.target
```

Le fuseau est écrit directement dans `OnCalendar`, comme pour les autres
timers BGM. Sans lui systemd raisonnerait en UTC et le récap arriverait à
11:00 en été. `Persistent=true` rattrape l'envoi si la machine était éteinte.

## Installation

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bgm-cron-preorders-recap.timer

# Vérifications
systemctl list-timers bgm-cron-preorders-recap.timer      # prochaine échéance
sudo systemctl start bgm-cron@preorders-recap.service     # envoi de test immédiat
journalctl -u bgm-cron@preorders-recap.service -n 20
```

Le test immédiat doit faire arriver un mail « 0 cette semaine » tant que le
journal est vide. C'est le comportement attendu, pas une erreur.

## Réinjection de l'historique

À faire **après** le déploiement : la table `book_preorders` est créée au
démarrage de l'application par `createDb`.

Les lignes récupérées le 08/09 vivent dans un CSV **non versionné** (ce dépôt
est public, ce sont des données personnelles), sous
`.local/analyses/precommandes-lasagne-recuperees.csv`.

Là où le dépôt est disponible avec un accès à la base :

```bash
DB_PATH=/opt/bgm/data/bgm.db npx tsx scripts/backfill-preorders.ts \
  .local/analyses/precommandes-lasagne-recuperees.csv
```

Idempotent : relançable sans créer de doublon. Les lignes marquées `test`
dans la colonne `note` sont ignorées.

Sur le VPS il n'y a **ni dépôt ni `tsx`** : l'application tourne depuis une
image Docker et `/home/lucid/apps/` ne contient pas BGM. Le rattrapage s'y
fait par `docker exec bgm-app node -e ...` en s'appuyant sur `node:sqlite`,
avec les lignes passées à la main.
