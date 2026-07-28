-- Update dhol_pan inventory for 28" old pane
-- Set thapi=37 and dhoom=51

-- First, check current values
SELECT 
  id, 
  pane_type, 
  size, 
  thapi, 
  dhoom,
  (thapi + dhoom) as total,
  created_at
FROM dhol_pan 
WHERE pane_type = 'old'
ORDER BY size;

-- Update 28" old pane (try all possible size formats)
UPDATE dhol_pan 
SET 
  thapi = 37,
  dhoom = 51
WHERE pane_type = 'old' 
  AND (
    size = '२८"' 
    OR size = '28"'
    OR size LIKE '%28%'
  );

-- Verify the update
SELECT 
  id, 
  pane_type, 
  size, 
  thapi, 
  dhoom,
  (thapi + dhoom) as total,
  'Updated successfully!' as status
FROM dhol_pan 
WHERE pane_type = 'old'
ORDER BY size;

-- Summary of all old pane inventory
SELECT 
  '📊 Dhol Pan Inventory Summary' as report,
  size,
  thapi as "Thapi Count",
  dhoom as "Dhoom Count",
  (thapi + dhoom) as "Total Count"
FROM dhol_pan
WHERE pane_type = 'old'
ORDER BY 
  CASE 
    WHEN size LIKE '%26%' THEN 1
    WHEN size LIKE '%28%' THEN 2
    WHEN size LIKE '%30%' THEN 3
    ELSE 4
  END;
