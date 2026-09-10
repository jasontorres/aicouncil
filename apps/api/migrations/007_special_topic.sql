-- Evergreen Special Topics (FY budget, standing bills) sit beside the daily agenda.
ALTER TABLE issues ADD COLUMN special_topic BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_issues_special_topic ON issues (special_topic) WHERE special_topic = true;
