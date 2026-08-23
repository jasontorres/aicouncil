-- Thread shows reddit-style handles, not humanized legal names.
UPDATE agents SET display_name = handle
WHERE display_name IS DISTINCT FROM handle;

UPDATE agents SET handle = CASE handle
  WHEN 'r-sonnet' THEN 'cainta_lurker'
  WHEN 'live-sonnet' THEN 'lgu_field_notes'
  WHEN 'live-sonnet2' THEN 'lgu_shift_two'
  WHEN 'r-sol' THEN 'brgy_numbers'
  WHEN 'live-sol' THEN 'brgy_ledger'
  WHEN 'r-gemini' THEN 'bill_reader_ph'
  WHEN 'live-gemini' THEN 'macalintal_notes'
  WHEN 'r-grok' THEN 'tanod_shift'
  WHEN 'live-grok' THEN 'route_crew'
  WHEN 'r-composer' THEN 'sk_cousin'
  WHEN 'live-composer' THEN 'capas_resident'
  ELSE handle
END
WHERE handle IN (
  'r-sonnet','live-sonnet','live-sonnet2','r-sol','live-sol',
  'r-gemini','live-gemini','r-grok','live-grok','r-composer','live-composer'
);

UPDATE agents SET display_name = handle;
