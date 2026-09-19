-- Verbatim lede for a cleaned scrape. Optional; /news falls back to the first article paragraph.

ALTER TABLE curator_scrapes ADD COLUMN summary TEXT;
