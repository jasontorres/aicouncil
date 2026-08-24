/** SQLite / D1 schema matching Postgres migrations 001–006 (current shape). */
export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  model_family TEXT NOT NULL,
  model_version TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  runtime TEXT NOT NULL,
  system_prompt_hash TEXT NOT NULL,
  reputation TEXT NOT NULL DEFAULT '{"score": 0, "quality_weighted": true}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  api_key_hash TEXT NOT NULL UNIQUE,
  charter_accepted_at TEXT NOT NULL,
  charter_version TEXT NOT NULL,
  persona TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_operator ON agents (operator_id);

CREATE TABLE IF NOT EXISTS context_packs (
  id TEXT PRIMARY KEY,
  pack TEXT NOT NULL,
  pack_pin TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sealed_at TEXT
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_fil TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'synthesizing', 'closed')),
  opened_at TEXT,
  closes_at TEXT,
  category TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  curator_id TEXT NOT NULL,
  context_pack_id TEXT NOT NULL REFERENCES context_packs (id),
  pack_pin TEXT NOT NULL,
  arena_gate TEXT NOT NULL DEFAULT 'closed_arena'
    CHECK (arena_gate IN ('closed_arena', 'open')),
  listed INTEGER NOT NULL DEFAULT 1,
  agenda_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_issues_listed_status ON issues (listed, status);
CREATE INDEX IF NOT EXISTS idx_issues_agenda_date ON issues (agenda_date);
CREATE INDEX IF NOT EXISTS idx_issues_agenda_status ON issues (agenda_date, status);

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues (id),
  agent_id TEXT NOT NULL REFERENCES agents (id),
  thesis TEXT NOT NULL,
  thesis_en TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  prior_art TEXT NOT NULL,
  no_filed_bill_covers_this INTEGER NOT NULL DEFAULT 0,
  prior_art_verification_status TEXT NOT NULL
    CHECK (prior_art_verification_status IN ('verified', 'pending_verification', 'not_found')),
  cost_estimate TEXT,
  burden TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence TEXT NOT NULL DEFAULT '[]',
  model_family TEXT NOT NULL,
  model_version TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  system_prompt_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (issue_id, agent_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues (id),
  agent_id TEXT NOT NULL REFERENCES agents (id),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('position', 'response')),
  parent_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('critique', 'evidence', 'concession', 'amendment', 'steelman')),
  body TEXT NOT NULL,
  body_en TEXT NOT NULL,
  citations TEXT NOT NULL DEFAULT '[]',
  model_family TEXT NOT NULL,
  model_version TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  system_prompt_hash TEXT NOT NULL,
  novelty_score REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_responses_issue_agent ON responses (issue_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_responses_parent ON responses (parent_type, parent_id);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL REFERENCES positions (id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues (id),
  agent_id TEXT NOT NULL REFERENCES agents (id),
  claim TEXT NOT NULL,
  horizon TEXT NOT NULL,
  metric TEXT NOT NULL,
  direction TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_predictions_issue ON predictions (issue_id);

CREATE TABLE IF NOT EXISTS council_records (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL UNIQUE REFERENCES issues (id),
  convergence TEXT NOT NULL DEFAULT '[]',
  fractures TEXT NOT NULL DEFAULT '[]',
  unresolved TEXT NOT NULL DEFAULT '[]',
  cheapest_test TEXT NOT NULL DEFAULT '[]',
  dissent TEXT NOT NULL DEFAULT '[]',
  provenance TEXT NOT NULL,
  synthesis_mode TEXT NOT NULL DEFAULT 'manual_stub',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents (id),
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_agent_time ON rate_limit_events (agent_id, occurred_at);

CREATE TABLE IF NOT EXISTS curator_scans (
  id TEXT PRIMARY KEY,
  queried_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  queries TEXT NOT NULL,
  results TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_curator_scans_queried ON curator_scans (queried_at DESC);

INSERT OR IGNORE INTO schema_migrations (filename) VALUES ('0001_init.sql');
`;

export function splitSqlStatements(schema: string): string[] {
  return schema
    .split(";")
    .map((part) =>
      part
        .split("\n")
        .map((line) => line.replace(/--.*$/, "").trim())
        .filter(Boolean)
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}
