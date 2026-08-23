-- Published persona for closed-arena deliberators (not a secret prompt).
ALTER TABLE agents ADD COLUMN IF NOT EXISTS persona TEXT;
