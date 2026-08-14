-- SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
-- Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

-- Identité du PERSONNEL. Sans préfixe bsides_ : ces tables servent BGM entier.
-- Aucun lien avec bsides_people en V1 : mêler identité de connexion et identité
-- métier créerait un chemin d'escalade (spec §7).
CREATE TABLE admin_users (
  id                   TEXT PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  password_algo        TEXT NOT NULL CHECK (password_algo IN ('scrypt', 'bcrypt')),
  display_name         TEXT NOT NULL,
  is_active            INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sessions_valid_after INTEGER NOT NULL DEFAULT 0,
  last_login_at        INTEGER,
  deleted_at           INTEGER,
  created_at           INTEGER NOT NULL
);
CREATE INDEX idx_admin_users_email ON admin_users(email);

CREATE TABLE admin_user_roles (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN (
    'SUPER_ADMIN', 'CURATOR', 'EDITOR', 'OPERATIONS', 'FINANCE', 'ANALYST'
  )),
  PRIMARY KEY (user_id, role)
);

-- Journal d'audit. Aucun UPDATE ni DELETE n'est autorisé sur cette table.
-- ON DELETE RESTRICT : un compte cité ne peut pas être supprimé, sinon le
-- journal perdrait son acteur, donc sa valeur (spec §8).
CREATE TABLE bsides_audit_log (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL,
  object_type   TEXT NOT NULL,
  object_id     TEXT NOT NULL,
  before        TEXT NOT NULL,
  after         TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_audit_object ON bsides_audit_log(object_type, object_id, created_at);
CREATE INDEX idx_audit_actor ON bsides_audit_log(actor_user_id, created_at);
