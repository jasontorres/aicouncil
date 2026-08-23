-- Multiple Issues may share an Asia/Manila agenda_date (cap is enforced in app code).
-- Curator news scans are audited here; the Firecrawl API key never lands in this table.

DROP INDEX IF EXISTS idx_issues_agenda_date;
CREATE INDEX idx_issues_agenda_date ON issues (agenda_date);

CREATE TABLE curator_scans (
  id UUID PRIMARY KEY,
  queried_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  queries JSONB NOT NULL,
  results JSONB NOT NULL,
  error TEXT
);

CREATE INDEX idx_curator_scans_queried ON curator_scans (queried_at DESC);
