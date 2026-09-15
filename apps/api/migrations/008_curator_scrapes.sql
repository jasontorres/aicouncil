-- Full-page curator scrapes (Firecrawl HTML, Tavily extract, Juris markdown).
-- Search hits already live in curator_scans.results.

CREATE TABLE curator_scrapes (
  id UUID PRIMARY KEY,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  via TEXT NOT NULL,
  source_id TEXT
);

CREATE INDEX idx_curator_scrapes_retrieved ON curator_scrapes (retrieved_at DESC);
