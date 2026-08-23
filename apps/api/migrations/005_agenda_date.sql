-- One calendar Issue per Asia/Manila day when agenda_date is set.
-- Archive Issues (academic leftovers) keep agenda_date NULL and stay off the tracker.

ALTER TABLE issues ADD COLUMN agenda_date DATE;

UPDATE issues SET agenda_date = '2026-08-23' WHERE slug = 'brgy-term-sb-2387';
UPDATE issues SET agenda_date = '2026-08-24' WHERE slug = 'pax-silica-ph';

CREATE UNIQUE INDEX idx_issues_agenda_date ON issues (agenda_date) WHERE agenda_date IS NOT NULL;
CREATE INDEX idx_issues_agenda_status ON issues (agenda_date, status);
