-- SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
-- Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

-- Rend `bsides_audit_log.actor_user_id` optionnel (revue de sécurité du
-- 2026-08-15, C-2/I-4 : journalisation des tentatives d'authentification).
--
-- Un échec de connexion sur un email INCONNU n'a, par construction, aucune
-- ligne `admin_users` à citer. Deux mauvaises solutions étaient possibles :
-- créer un compte fictif pour porter la référence (une fausse identité, ce
-- que le §8 de la spec proscrit) ; ou garder `NOT NULL` et donc ne JAMAIS
-- journaliser ces tentatives — exactement l'angle mort qu'exploite un
-- devinement distribué sur l'unique administrateur, puisque la quasi-totalité
-- des essais porteront un email qui n'est pas le sien.
--
-- SQLite n'applique JAMAIS une contrainte de clé étrangère à une valeur NULL
-- (comportement documenté du moteur). Rendre la colonne nullable représente
-- donc « acteur inconnu » sans violer la contrainte et sans fausse identité :
-- NULL n'est ni un compte inventé ni un compte réel détourné de son sens. Tout
-- acteur RÉEL cité reste protégé par `ON DELETE RESTRICT`, inchangé.
--
-- SQLite ne sait pas retirer un NOT NULL par ALTER TABLE : reconstruction
-- complète de la table, à l'identique sinon. Les lignes existantes ont toutes
-- un actor_user_id NOT NULL déjà valide (contrainte d'origine) : la copie ne
-- peut donc pas violer la nouvelle contrainte, plus permissive.
CREATE TABLE bsides_audit_log_new (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL,
  object_type   TEXT NOT NULL,
  object_id     TEXT NOT NULL,
  before        TEXT NOT NULL,
  after         TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

INSERT INTO bsides_audit_log_new
  SELECT id, actor_user_id, action, object_type, object_id, before, after, created_at
    FROM bsides_audit_log;

DROP TABLE bsides_audit_log;
ALTER TABLE bsides_audit_log_new RENAME TO bsides_audit_log;

CREATE INDEX idx_audit_object ON bsides_audit_log(object_type, object_id, created_at);
CREATE INDEX idx_audit_actor ON bsides_audit_log(actor_user_id, created_at);
