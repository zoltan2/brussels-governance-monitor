-- SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
-- Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

CREATE TABLE IF NOT EXISTS refonte_votes (
  id          TEXT PRIMARY KEY,
  axis1       TEXT NOT NULL,
  axis2       TEXT NOT NULL,
  axis3       TEXT NOT NULL,
  axis4       TEXT NOT NULL,
  axis5       TEXT NOT NULL,
  comment     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  email_optin INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refonte_votes_created ON refonte_votes(created_at);

CREATE TABLE IF NOT EXISTS chat_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  stream     TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_logs_stream ON chat_logs(stream, id);
