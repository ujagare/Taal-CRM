-- ============================================
-- Dhol Pan Inventory - Complete Setup Script
-- ============================================
-- This script will insert/update all pan sizes with correct initial values

-- First, delete existing data to start fresh (optional - remove if you want to keep history)
-- DELETE FROM dhol_pan;

-- Insert or Update Old Pane Stock (26", 28", 30")
-- Using ON CONFLICT to handle both insert and update

INSERT INTO dhol_pan (pane_type, size, thapi, dhoom, arrived_at, brought_by, brought_at)
VALUES 
  ('old', '26"', 3, 3, NOW(), NULL, NULL),
  ('old', '28"', 37, 51, NOW(), NULL, NULL),
  ('old', '30"', 8, 9, NOW(), NULL, NULL)
ON CONFLICT (pane_type, size) 
DO UPDATE SET 
  thapi = EXCLUDED.thapi,
  dhoom = EXCLUDED.dhoom,
  arrived_at = NOW();

-- Insert or Update New Pane Stock (all start with 0)
INSERT INTO dhol_pan (pane_type, size, thapi, dhoom, arrived_at, brought_by, brought_at)
VALUES 
  ('new', '26"', 0, 0, NOW(), NULL, NULL),
  ('new', '28"', 0, 0, NOW(), NULL, NULL),
  ('new', '30"', 0, 0, NOW(), NULL, NULL)
ON CONFLICT (pane_type, size) 
DO UPDATE SET 
  thapi = EXCLUDED.thapi,
  dhoom = EXCLUDED.dhoom,
  arrived_at = NOW();

-- Verify the data
SELECT 
  pane_type,
  size,
  thapi,
  dhoom,
  (thapi + dhoom) as total,
  arrived_at,
  brought_by
FROM dhol_pan
ORDER BY pane_type, size;
