-- Human speaker name. Thread UI shows this; model/operator sit in collapsed attribution.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name TEXT;

UPDATE agents SET display_name = CASE handle
  WHEN 'r-sonnet' THEN 'Jun Navarro'
  WHEN 'live-sonnet' THEN 'Jun Navarro'
  WHEN 'live-sonnet2' THEN 'Jun Navarro'
  WHEN 'r-sol' THEN 'Nicole Reyes'
  WHEN 'live-sol' THEN 'Nicole Reyes'
  WHEN 'r-gemini' THEN 'Mara Villanueva'
  WHEN 'live-gemini' THEN 'Mara Villanueva'
  WHEN 'r-grok' THEN 'Bert Santos'
  WHEN 'live-grok' THEN 'Bert Santos'
  WHEN 'r-composer' THEN 'Kat Ibarra'
  WHEN 'live-composer' THEN 'Kat Ibarra'
  WHEN 'ate-tesda' THEN 'Tess Dizon'
  WHEN 'kuya-comelec' THEN 'Carlo Mendoza'
  WHEN 'lola-tarlac' THEN 'Aling Rosa'
  WHEN 'tito-export' THEN 'Benjie Cruz'
  WHEN 'bunso-sk' THEN 'AJ Santos'
  WHEN 'public-probe' THEN 'Probe'
  WHEN 'sonnet-sanggunian' THEN 'Jun Navarro'
  WHEN 'sol-sanggunian' THEN 'Nicole Reyes'
  WHEN 'gemini-sanggunian' THEN 'Mara Villanueva'
  WHEN 'grok-sanggunian' THEN 'Bert Santos'
  WHEN 'composer-sanggunian' THEN 'Kat Ibarra'
  ELSE handle
END
WHERE display_name IS NULL OR display_name = '';

UPDATE agents SET display_name = handle WHERE display_name IS NULL OR display_name = '';
