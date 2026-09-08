# Récap hebdomadaire des précommandes — installation du déclencheur

La route `GET /api/cron/preorders-recap` envoie à `contact@brusselsgovernance.be`
la liste prénom + email des précommandes du livre des sept derniers jours.
Elle part **même à zéro précommande** : un silence dans la boîte doit vouloir
dire « le cron est cassé », jamais « semaine calme ». C'est l'ambiguïté inverse
qui a laissé passer quatre mois de pertes entre le 16/04 et le 08/09/2026.

Le code est dans le dépôt ; l'horaire, lui, vit sur le VPS. Voici les deux
unités à y poser.

## Piège d'horaire

`OnCalendar` ci-dessous fixe le fuseau explicitement avec `Persistent=true`.
Sans la ligne `Timezone`, systemd raisonne en UTC et le récap arriverait à
11:00 en été. Le digest hebdomadaire connaît déjà ce piège (21:00
Europe/Brussels = 19:00 UTC l'été).

`Persistent=true` rattrape l'envoi si la machine était éteinte à l'heure dite.

## `/etc/systemd/system/bgm-preorders-recap.service`

```ini
[Unit]
Description=BGM — récap hebdomadaire des précommandes du livre
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Le secret n'apparaît pas dans la ligne de commande : il est lu depuis un
# fichier en 0600, root uniquement.
EnvironmentFile=/etc/bgm/cron.env
ExecStart=/usr/bin/curl --fail --silent --show-error --max-time 60 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://governance.brussels/api/cron/preorders-recap
```

## `/etc/systemd/system/bgm-preorders-recap.timer`

```ini
[Unit]
Description=BGM — récap précommandes, tous les mardis à 09:00

[Timer]
OnCalendar=Tue *-*-* 09:00:00
Timezone=Europe/Brussels
Persistent=true

[Install]
WantedBy=timers.target
```

## Installation

```bash
# Le secret, si /etc/bgm/cron.env n'existe pas encore
sudo install -d -m 700 /etc/bgm
printf 'CRON_SECRET=%s\n' "$CRON_SECRET" | sudo tee /etc/bgm/cron.env >/dev/null
sudo chmod 600 /etc/bgm/cron.env

sudo systemctl daemon-reload
sudo systemctl enable --now bgm-preorders-recap.timer

# Vérifications
systemctl list-timers bgm-preorders-recap.timer   # prochaine échéance
sudo systemctl start bgm-preorders-recap.service  # envoi de test immédiat
journalctl -u bgm-preorders-recap.service -n 20
```

Le test immédiat doit faire arriver un mail « 0 cette semaine » si le journal
est encore vide. C'est le comportement attendu, pas une erreur.

## Réinjection de l'historique

Une fois le correctif déployé (la table `book_preorders` est créée au
démarrage par `createDb`), les précommandes retrouvées le 08/09 se remettent
dans le journal depuis un CSV **non versionné** (ce dépôt est public, ces
lignes sont des données personnelles) :

```bash
DB_PATH=/opt/bgm/data/bgm.db npx tsx scripts/backfill-preorders.ts \
  .local/analyses/precommandes-lasagne-recuperees.csv
```

Idempotent : relançable sans créer de doublon. Les lignes marquées `test`
dans la colonne `note` sont ignorées.

Sur le VPS il n'y a ni dépôt ni `tsx` : l'application tourne depuis une image
Docker. Le rattrapage s'y fait par `docker exec bgm-app node -e ...`, en
s'appuyant sur `node:sqlite`, avec les lignes passées à la main.
