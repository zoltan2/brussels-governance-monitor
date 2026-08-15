-- SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
-- Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

-- Identité commune (spec §6.1). Champs légaux jamais exposés publiquement.
CREATE TABLE bsides_people (
  id             TEXT PRIMARY KEY,
  email          TEXT UNIQUE,
  legal_name     TEXT,
  display_name   TEXT,
  phone          TEXT,
  country        TEXT,
  internal_notes TEXT,
  deleted_at     INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE bsides_artist_profiles (
  id                 TEXT PRIMARY KEY,
  person_id          TEXT NOT NULL REFERENCES bsides_people(id) ON DELETE RESTRICT,
  slug               TEXT NOT NULL UNIQUE,
  bio                TEXT,
  website            TEXT,
  crm_status         TEXT NOT NULL CHECK (crm_status IN (
    'discovered', 'researching', 'qualified', 'shortlisted', 'contacted',
    'responded', 'meeting_scheduled', 'negotiating', 'agreed', 'onboarding',
    'active', 'paused', 'declined', 'rejected', 'unreachable', 'withdrawn',
    'alumni', 'blacklisted', 'archived'
  )),
  contractual_status TEXT,
  payout_status      TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX idx_artist_profiles_status ON bsides_artist_profiles(crm_status);

-- Jamais d'UPDATE : une évaluation nouvelle crée une ligne (spec §6.3).
--
-- Les huit critères, les trois booléens et le total viennent du §6.3 de la spec
-- maîtresse, verbatim. Une version antérieure de ce plan n'en gardait que deux
-- (`artistic_score`, `fit_score`) : c'était une perte de six critères, du
-- réviseur et du total, repérée le 2026-08-14 en concevant le backoffice du
-- Sprint 2. Corrigé avant application — un fichier de migration appliqué ne se
-- corrige plus, il se remplace par un suivant.
--
-- `calculated_total` reste NULLABLE : sa formule de pondération est un choix
-- curatorial non tranché. La colonne existe, personne ne la remplit encore.
CREATE TABLE bsides_artist_scores (
  id                  TEXT PRIMARY KEY,
  artist_profile_id   TEXT NOT NULL REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  reviewer_id         TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  artistic_quality    INTEGER NOT NULL CHECK (artistic_quality    BETWEEN 0 AND 10),
  originality         INTEGER NOT NULL CHECK (originality         BETWEEN 0 AND 10),
  brussels_connection INTEGER NOT NULL CHECK (brussels_connection BETWEEN 0 AND 10),
  storytelling        INTEGER NOT NULL CHECK (storytelling        BETWEEN 0 AND 10),
  b_sides_fit         INTEGER NOT NULL CHECK (b_sides_fit         BETWEEN 0 AND 10),
  portfolio_quality   INTEGER NOT NULL CHECK (portfolio_quality   BETWEEN 0 AND 5),
  communication       INTEGER NOT NULL CHECK (communication       BETWEEN 0 AND 5),
  reliability         INTEGER NOT NULL CHECK (reliability         BETWEEN 0 AND 5),
  homepage_test       INTEGER NOT NULL DEFAULT 0 CHECK (homepage_test      IN (0, 1)),
  proud_to_present    INTEGER NOT NULL DEFAULT 0 CHECK (proud_to_present   IN (0, 1)),
  tells_something     INTEGER NOT NULL DEFAULT 0 CHECK (tells_something    IN (0, 1)),
  qualitative_notes   TEXT,
  calculated_total    INTEGER,
  created_at          INTEGER NOT NULL
);
CREATE INDEX idx_artist_scores_profile ON bsides_artist_scores(artist_profile_id, created_at);

-- Recommandeur artiste OU personne, jamais les deux nuls (spec §6.4).
CREATE TABLE bsides_artist_recommendations (
  id                     TEXT PRIMARY KEY,
  recommended_profile_id TEXT NOT NULL REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  by_artist_profile_id   TEXT REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  by_person_id           TEXT REFERENCES bsides_people(id) ON DELETE RESTRICT,
  note                   TEXT,
  created_at             INTEGER NOT NULL,
  CHECK (by_artist_profile_id IS NOT NULL OR by_person_id IS NOT NULL)
);

-- Œuvre générique : visuelle, physique, sonore, numérique, textuelle,
-- performative. L'architecture doit les accepter toutes (spec §2).
CREATE TABLE bsides_works (
  id                TEXT PRIMARY KEY,
  artist_profile_id TEXT REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  work_type         TEXT NOT NULL CHECK (work_type IN (
    'PAINTING', 'DRAWING', 'PRINT', 'PHOTOGRAPH', 'SCULPTURE', 'INSTALLATION',
    'TEXTILE', 'CERAMIC', 'MIXED_MEDIA', 'DIGITAL', 'VIDEO', 'SOUND', 'MUSIC',
    'TEXT', 'PERFORMANCE'
  )),
  description       TEXT,
  year              INTEGER,
  published_at      INTEGER,
  archived_at       INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

-- public = 0 par défaut : un média n'est visible qu'après décision explicite.
CREATE TABLE bsides_work_media (
  id            TEXT PRIMARY KEY,
  work_id       TEXT NOT NULL REFERENCES bsides_works(id) ON DELETE RESTRICT,
  kind          TEXT NOT NULL CHECK (kind IN ('master', 'variant', 'portrait')),
  storage_path  TEXT NOT NULL,
  mime_type     TEXT,
  bytes         INTEGER,
  display_order INTEGER NOT NULL,
  public        INTEGER NOT NULL DEFAULT 0 CHECK (public IN (0, 1)),
  uploaded_by   TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_work_media_work ON bsides_work_media(work_id, display_order);

CREATE TABLE bsides_collections (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  sequence_number INTEGER NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  statement       TEXT,
  published_at    INTEGER,
  archived_at     INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE bsides_collection_works (
  collection_id TEXT NOT NULL REFERENCES bsides_collections(id) ON DELETE RESTRICT,
  work_id       TEXT NOT NULL REFERENCES bsides_works(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL,
  PRIMARY KEY (collection_id, work_id)
);
