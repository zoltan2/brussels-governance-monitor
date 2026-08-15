// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { recordAudit } from '../audit';
import { withTransaction } from '../tx';

export function createPerson(
  db: DatabaseSync,
  input: {
    email?: string; firstName?: string; lastName?: string; displayName?: string;
    phone?: string; preferredLocale?: string; country?: string; city?: string;
    addressLine1?: string; addressLine2?: string; postalCode?: string;
  },
): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO bsides_people
       (id, first_name, last_name, display_name, email, phone, preferred_locale,
        country, city, address_line1, address_line2, postal_code,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, input.firstName ?? null, input.lastName ?? null, input.displayName ?? null,
    input.email ?? null, input.phone ?? null, input.preferredLocale ?? null,
    input.country ?? null, input.city ?? null, input.addressLine1 ?? null,
    input.addressLine2 ?? null, input.postalCode ?? null, now, now,
  );
  return id;
}

/**
 * Effacement RGPD (spec §47) — immédiat, pas différé, et distinct du
 * `deleted_at` qui n'est qu'une suppression douce. Les enregistrements
 * comptables du §19 ne sont pas touchés : ils portent un nom figé, jamais une
 * référence vivante.
 *
 * L'effacement ne s'arrête pas à `bsides_people`. Toute donnée personnelle
 * portée ailleurs doit tomber avec elle, sinon l'effacement est partiel — ce
 * qui est pire qu'absent, puisqu'il se croit fait. Inventaire complet des
 * champs nominatifs du domaine (revue du 2026-08-15, avant toute application
 * sur base persistante) :
 *
 *   - `bsides_artist_profiles.internal_notes` : les notes internes ont suivi le
 *     §6.2 sur le profil ; elles décrivent la personne et restent personnelles.
 *   - `bsides_artist_profiles.artist_name` et `.slug` : voir ci-dessous, c'est
 *     la correction de ce commentaire — les deux avaient été oubliés alors que
 *     `internal_notes` et `portrait_media_id` étaient déjà traités.
 *   - `bsides_person_media` : les portraits. Supprimés, pas anonymisés — une
 *     image reste identifiante quoi qu'on écrive à côté. `portrait_media_id`
 *     est délié d'abord, sans quoi la clé étrangère refuserait la suppression.
 *   - `bsides_artist_scores.qualitative_notes`, `bsides_works.artist_statement`
 *     / `.editorial_story`, `bsides_work_media.copyright_credit` : du texte
 *     libre rédigé par l'équipe ou l'artiste, qui PEUT nommer la personne en
 *     prose. Non traité ici, et volontairement : ce ne sont pas des champs
 *     d'identité mais du contenu éditorial rattaché à des œuvres qui, elles,
 *     survivent à l'effacement (voir plus bas) — `copyright_credit` en
 *     particulier doit rester nominatif, une mention de droit sans nom d'auteur
 *     n'ayant pas de valeur légale. Passer ces colonnes au crible d'un nom
 *     donné exigerait une recherche en texte libre que le reste du code base
 *     ne fait nulle part ailleurs ; ce n'est pas ce défaut-ci.
 *   - `bsides_artist_recommendations.source_text` : peut porter le nom écrit à
 *     la main d'un tiers quelconque (§6.4, Correctif 1) — jamais lié par clé
 *     étrangère à `personId`, donc jamais rattachable à CET effacement de
 *     façon fiable. Les colonnes `by_artist_profile_id` / `by_person_id`, elles,
 *     restent des clés vers des lignes qui persistent (anonymisées sur place),
 *     pas des recopies de nom : rien à effacer là.
 *   - `admin_users` : identité du personnel BGM, hors du domaine effacé ici.
 *
 * `artist_name` et `slug` — la tension et la décision :
 * Les masters d'œuvres (`bsides_work_media`) et les œuvres elles-mêmes
 * (`bsides_works`) ne sont PAS touchés : ils portent des droits contractuels et
 * relèvent d'un régime de conservation opposé (§36). C'est la raison d'être de
 * la séparation des deux tables de médias. Mais une œuvre reste attribuée à un
 * `artist_profile_id` (ON DELETE RESTRICT) : la ligne de profil ne peut donc
 * pas disparaître tant qu'une œuvre la référence, et ne doit pas disparaître de
 * toute façon — le profil porte l'historique CRM (scores, recommandations).
 * Le profil reste donc en place, comme `bsides_people` reste en place.
 *
 * Or `artist_name` est un identifiant vivant de LA PERSONNE : contrairement au
 * nom figé des instantanés de commande du §19 (une copie prise une fois pour
 * toutes, qui ne pointe plus vers rien de vivant), `artist_name` est le nom
 * actuel sous lequel cette personne, toujours référencée par `person_id`, se
 * présente publiquement. Le garder tel quel après effacement reviendrait à
 * effacer l'état civil dans `bsides_people` tout en laissant le nom d'usage
 * s'afficher juste à côté. Il est donc mis à NULL, comme les autres champs
 * d'identité.
 *
 * `slug` ne peut pas suivre le même traitement : il est `NOT NULL UNIQUE`, et
 * sert d'identifiant d'URL publique. Le laisser tel quel expose le nom dans une
 * adresse ; le supprimer casserait la contrainte et toute référence externe
 * déjà publiée. La sortie retenue applique ici, littéralement, le motif du §10 :
 * on lui donne un nom figé — `'erased-' || id`, dérivé de l'identifiant
 * opaque et stable de la ligne, jamais du nom de la personne — au lieu d'une
 * référence vivante. Figé une fois pour toutes, garanti unique (dérivé de la
 * clé primaire), non devinable et non nominatif : l'ancienne URL publique cesse
 * de désigner la personne sans que la colonne ne devienne invalide.
 */
export function erasePerson(db: DatabaseSync, personId: string, actorUserId: string): void {
  withTransaction(db, () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `UPDATE bsides_people
          SET email = NULL, first_name = NULL, last_name = NULL,
              display_name = NULL, phone = NULL, preferred_locale = NULL,
              country = NULL, city = NULL, address_line1 = NULL,
              address_line2 = NULL, postal_code = NULL,
              deleted_at = ?, updated_at = ?
        WHERE id = ?`,
    ).run(now, now, personId);

    db.prepare(
      `UPDATE bsides_artist_profiles
          SET artist_name = NULL, slug = 'erased-' || id,
              internal_notes = NULL, portrait_media_id = NULL, updated_at = ?
        WHERE person_id = ?`,
    ).run(now, personId);

    db.prepare('DELETE FROM bsides_person_media WHERE person_id = ?').run(personId);

    recordAudit(db, {
      actorUserId, action: 'person.erased', objectType: 'bsides_people',
      objectId: personId, before: {}, after: {},
    });
  });
}
