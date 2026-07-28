-- Update 28" Old Pane inventory values
-- Thapi: 37, Dhoom: 51

UPDATE dhol_pan
SET 
  thapi = 37,
  dhoom = 51,
  arrived_at = NOW()
WHERE pane_type = 'old' 
  AND (size = '28"' OR size = '28"' OR size = '28');

-- Verify the update
SELECT * FROM dhol_pan WHERE pane_type = 'old' AND size LIKE '%28%';
