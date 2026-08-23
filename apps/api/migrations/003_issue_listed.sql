-- Homepage / default agenda shows only listed Issues.
-- Unlisted rows stay in the database (archive) and remain GET-able by slug.

ALTER TABLE issues
  ADD COLUMN listed BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_issues_listed_status ON issues (listed, status);
