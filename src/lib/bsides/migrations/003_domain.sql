-- SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
-- Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

-- Ce fichier est écrit d'après la spécification maîtresse
-- `context/brussels_b_sides_technical_spec.md`, section par section, et non
-- d'après un résumé. Une première version l'avait été : elle avait inventé
-- dix-neuf statuts CRM en minuscules là où le §6.2 en énumère dix-neuf autres
-- en majuscules, et réduit `artist_profiles` à dix colonnes sur vingt-quatre.
-- Le compte des statuts tombait juste, les valeurs non — c'est exactement le
-- genre d'écart qu'un résumé produit. Corrigé le 2026-08-15, avant toute
-- application sur base persistante.

-- ---------------------------------------------------------------------------
-- §6.1 people — couche d'identité commune.
-- Champs légaux et de contact jamais exposés publiquement.
-- `first_name` / `last_name` viennent du §6.1 verbatim : une version antérieure
-- les avait fusionnés en un `legal_name` que la spec ne connaît pas.
-- `internal_notes` n'est PAS ici : le §6.2 le place sur le profil artiste.
-- ---------------------------------------------------------------------------
CREATE TABLE bsides_people (
  id               TEXT PRIMARY KEY,
  first_name       TEXT,
  last_name        TEXT,
  display_name     TEXT,
  email            TEXT UNIQUE COLLATE NOCASE,
  phone            TEXT,
  preferred_locale TEXT,
  country          TEXT,
  city             TEXT,
  address_line1    TEXT,
  address_line2    TEXT,
  postal_code      TEXT,
  deleted_at       INTEGER,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Médias de PERSONNE (portraits). Table distincte de `bsides_work_media`, et
-- c'est un choix, pas une commodité.
--
-- Le §6.2 demande `portrait_media_id`, mais la seule table de médias du domaine
-- est celle des œuvres, dont `work_id` est NOT NULL : un portrait d'artiste n'a
-- pas d'œuvre. Trois issues étaient possibles :
--   1. rendre `work_id` nullable — cela affaiblirait l'invariant « tout média
--      d'œuvre appartient à une œuvre » pour tous les médias, au profit d'un
--      seul cas ;
--   2. rattacher le portrait à une pseudo-œuvre — une fiction dans les données ;
--   3. une table de médias de personne — retenu.
--
-- La raison décisive est le RGPD (§47) : un portrait est une donnée personnelle
-- effaçable sur demande, un master d'œuvre ne l'est pas — il porte des droits
-- contractuels et doit survivre à l'effacement de la personne. Les deux régimes
-- de conservation étant opposés, les mélanger dans une table forcerait
-- l'effacement à distinguer ligne à ligne ce que le schéma peut distinguer une
-- fois pour toutes. `erasePerson` supprime ici, et ne touche jamais aux
-- masters d'œuvres.
-- ---------------------------------------------------------------------------
CREATE TABLE bsides_person_media (
  id               TEXT PRIMARY KEY,
  person_id        TEXT NOT NULL REFERENCES bsides_people(id) ON DELETE RESTRICT,
  media_type       TEXT NOT NULL CHECK (media_type IN (
    'IMAGE', 'AUDIO_PREVIEW', 'VIDEO', 'DOCUMENT', 'ASSET_360'
  )),
  variant_role     TEXT NOT NULL CHECK (variant_role IN ('master', 'variant')),
  storage_path     TEXT NOT NULL,
  alt_text         TEXT,
  caption          TEXT,
  copyright_credit TEXT,
  mime_type        TEXT,
  bytes            INTEGER,
  display_order    INTEGER NOT NULL,
  public           INTEGER NOT NULL DEFAULT 0 CHECK (public IN (0, 1)),
  uploaded_by      TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_person_media_person ON bsides_person_media(person_id, display_order);

-- ---------------------------------------------------------------------------
-- §6.2 artist_profiles — les vingt-quatre champs de la spec.
--
-- `social_links`, `disciplines` et `themes` sont marqués « JSON or normalized
-- join table » par la spec. Stockage JSON en colonne TEXT retenu : la spec
-- l'autorise explicitement, et une exposition de vingt artistes ne justifie pas
-- trois tables de jonction, leurs vocabulaires contrôlés et leurs migrations.
-- Le jour où la recherche par discipline devra être indexée, la normalisation
-- se fera par une migration ultérieure à partir de ces colonnes.
--
-- Les statuts CRM sont ceux du §6.2, en MAJUSCULES, verbatim.
-- `career_stage`, `discovery_source`, `public_status`, `onboarding_status`,
-- `contractual_status` et `payout_status` restent des TEXT sans CHECK :
-- la spec les nomme sans énumérer leurs valeurs, et inventer ces listes serait
-- refaire l'erreur que ce fichier corrige.
-- ---------------------------------------------------------------------------
CREATE TABLE bsides_artist_profiles (
  id                 TEXT PRIMARY KEY,
  person_id          TEXT NOT NULL REFERENCES bsides_people(id) ON DELETE RESTRICT,
  artist_name        TEXT,
  slug               TEXT NOT NULL UNIQUE,
  short_bio          TEXT,
  long_bio           TEXT,
  portrait_media_id  TEXT REFERENCES bsides_person_media(id) ON DELETE SET NULL,
  website_url        TEXT,
  social_links       TEXT, -- JSON (§6.2 : « JSON or normalized join table »)
  disciplines        TEXT, -- JSON (§6.2 : « JSON or normalized join table »)
  themes             TEXT, -- JSON (§6.2 : « JSON or normalized join table »)
  career_stage       TEXT,
  crm_status         TEXT NOT NULL CHECK (crm_status IN (
    'FOUND', 'REVIEW_PENDING', 'REVIEWED', 'SCORED', 'SHORTLISTED',
    'CONTACT_READY', 'CONTACTED', 'FOLLOWUP_1', 'FOLLOWUP_2', 'RESPONDED',
    'INTERESTED', 'MEETING', 'SELECTED', 'ONBOARDING', 'ACTIVE', 'AMBASSADOR',
    'NOT_NOW', 'DECLINED', 'ARCHIVED'
  )),
  discovery_source   TEXT,
  discovered_at      INTEGER,
  discovered_by      TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  public_status      TEXT,
  onboarding_status  TEXT,
  contractual_status TEXT,
  payout_status      TEXT,
  internal_notes     TEXT,
  why_b_sides        TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX idx_artist_profiles_status ON bsides_artist_profiles(crm_status);
CREATE INDEX idx_artist_profiles_person ON bsides_artist_profiles(person_id);

-- ---------------------------------------------------------------------------
-- §6.3 artist_scores. Jamais d'UPDATE : une évaluation nouvelle crée une ligne.
--
-- Les huit critères, les trois booléens et le total viennent du §6.3 de la spec
-- maîtresse, verbatim. Une version antérieure de ce plan n'en gardait que deux
-- (`artistic_score`, `fit_score`) : c'était une perte de six critères, du
-- réviseur et du total, repérée le 2026-08-14 en concevant le backoffice du
-- Sprint 2.
--
-- `calculated_total` reste NULLABLE : sa formule de pondération est un choix
-- curatorial non tranché. La colonne existe, personne ne la remplit encore.
-- ---------------------------------------------------------------------------
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

-- §6.4 artist_recommendations. Recommandeur artiste OU personne, jamais les
-- deux nuls. `source_text` porte le nom de la spec.
CREATE TABLE bsides_artist_recommendations (
  id                     TEXT PRIMARY KEY,
  recommended_profile_id TEXT NOT NULL REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  by_artist_profile_id   TEXT REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  by_person_id           TEXT REFERENCES bsides_people(id) ON DELETE RESTRICT,
  source_text            TEXT,
  created_at             INTEGER NOT NULL,
  CHECK (by_artist_profile_id IS NOT NULL OR by_person_id IS NOT NULL)
);
CREATE INDEX idx_recommendations_recommended
  ON bsides_artist_recommendations(recommended_profile_id);

-- ---------------------------------------------------------------------------
-- §6.5 works — œuvre générique : visuelle, physique, sonore, numérique,
-- textuelle, performative. L'architecture doit les accepter toutes (§2).
--
-- Les quatorze `work_type` sont ceux du §6.5, verbatim. Une version antérieure
-- en avait inventé quinze (DRAWING, PHOTOGRAPH, TEXTILE, MIXED_MEDIA, VIDEO) et
-- oublié ILLUSTRATION et OTHER.
--
-- `public_status`, `availability_status`, `rights_status` et `edition_type`
-- restent sans CHECK : le §45 ne donne qu'un exemple de machine à états
-- (« Example artwork »), et le §36 exige des droits en enregistrements
-- explicites, pas en énumération de colonne. Ces listes seront fermées quand la
-- spec les fermera.
--
-- `published_at` / `archived_at` ne sont pas dans la spec : ce sont les
-- horodatages opérationnels des opérations `works.publish` / `works.archive`,
-- complémentaires de `public_status` qui, lui, porte l'état.
-- ---------------------------------------------------------------------------
CREATE TABLE bsides_works (
  id                       TEXT PRIMARY KEY,
  artist_profile_id        TEXT REFERENCES bsides_artist_profiles(id) ON DELETE RESTRICT,
  slug                     TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  subtitle                 TEXT,
  work_type                TEXT NOT NULL CHECK (work_type IN (
    'ILLUSTRATION', 'PAINTING', 'PHOTOGRAPHY', 'SCULPTURE', 'CERAMIC', 'PRINT',
    'DIGITAL', 'MUSIC', 'SOUND', 'TEXT', 'PERFORMANCE', 'INSTALLATION',
    'MIXED', 'OTHER'
  )),
  year                     INTEGER,
  short_description        TEXT,
  long_description         TEXT,
  artist_statement         TEXT,
  editorial_story          TEXT,
  technique                TEXT,
  materials                TEXT,
  dimensions               TEXT,
  weight                   REAL, -- en grammes
  edition_type             TEXT,
  edition_total            INTEGER,
  edition_available        INTEGER,
  authenticity_certificate INTEGER NOT NULL DEFAULT 0 CHECK (authenticity_certificate IN (0, 1)),
  public_status            TEXT,
  availability_status      TEXT,
  primary_media_id         TEXT REFERENCES bsides_work_media(id) ON DELETE SET NULL,
  rights_status            TEXT,
  published_at             INTEGER,
  archived_at              INTEGER,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE INDEX idx_works_artist ON bsides_works(artist_profile_id);

-- ---------------------------------------------------------------------------
-- §6.6 work_media. `public` = 0 par défaut : un média n'est visible qu'après
-- décision explicite.
--
-- `media_type` porte la nature du média (§6.6), `variant_role` la distinction
-- master / variante responsive (§35) : ce sont deux axes, que la version
-- antérieure confondait dans un unique `kind` ('master', 'variant', 'portrait').
-- 'portrait' n'y a plus sa place — les portraits vivent dans
-- `bsides_person_media`, sous un régime de conservation opposé.
-- `work_id` reste NOT NULL : un média d'œuvre appartient toujours à une œuvre.
-- ---------------------------------------------------------------------------
CREATE TABLE bsides_work_media (
  id               TEXT PRIMARY KEY,
  work_id          TEXT NOT NULL REFERENCES bsides_works(id) ON DELETE RESTRICT,
  media_type       TEXT NOT NULL CHECK (media_type IN (
    'IMAGE', 'AUDIO_PREVIEW', 'VIDEO', 'DOCUMENT', 'ASSET_360'
  )),
  variant_role     TEXT NOT NULL CHECK (variant_role IN ('master', 'variant')),
  storage_path     TEXT NOT NULL,
  alt_text         TEXT,
  caption          TEXT,
  copyright_credit TEXT,
  mime_type        TEXT,
  bytes            INTEGER,
  display_order    INTEGER NOT NULL,
  public           INTEGER NOT NULL DEFAULT 0 CHECK (public IN (0, 1)),
  uploaded_by      TEXT REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_work_media_work ON bsides_work_media(work_id, display_order);

-- §9 collections — objet éditorial public.
-- `published_at` / `archived_at` : horodatages opérationnels, comme pour works.
CREATE TABLE bsides_collections (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  subtitle              TEXT,
  sequence_number       INTEGER NOT NULL UNIQUE,
  curatorial_statement  TEXT,
  creative_brief        TEXT,
  hero_media_id         TEXT REFERENCES bsides_work_media(id) ON DELETE SET NULL,
  starts_at             INTEGER,
  ends_at               INTEGER,
  public_status         TEXT,
  seo_title             TEXT,
  seo_description       TEXT,
  published_at          INTEGER,
  archived_at           INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

-- §9 collection_works — table de jonction, avec son éditorial propre.
CREATE TABLE bsides_collection_works (
  collection_id  TEXT NOT NULL REFERENCES bsides_collections(id) ON DELETE RESTRICT,
  work_id        TEXT NOT NULL REFERENCES bsides_works(id) ON DELETE RESTRICT,
  display_order  INTEGER NOT NULL,
  editorial_note TEXT,
  featured       INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  selected_at    INTEGER,
  PRIMARY KEY (collection_id, work_id)
);
CREATE INDEX idx_collection_works_work ON bsides_collection_works(work_id);
